import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { ZodError, z } from "zod";
import { HttpError, ValidationError } from "./errors.js";
import { ORDER_STATUSES } from "./domain.js";
import { createLogger, type Logger } from "./logger.js";
import { createOrderRepository } from "./order-repository.js";
import { OrderService } from "./order-service.js";

type AppServerOptions = {
  logger?: Logger;
  service?: OrderService;
};

function parseDateInput(value: string, endOfDay: boolean) {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}${endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"}`;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

const dateFromSchema = z.string().trim().min(1).transform((value, ctx) => {
  const parsed = parseDateInput(value, false);

  if (!parsed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid date format. Use YYYY-MM-DD or ISO 8601.",
    });
    return z.NEVER;
  }

  return parsed;
});

const dateToSchema = z.string().trim().min(1).transform((value, ctx) => {
  const parsed = parseDateInput(value, true);

  if (!parsed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid date format. Use YYYY-MM-DD or ISO 8601.",
    });
    return z.NEVER;
  }

  return parsed;
});

const listOrdersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(ORDER_STATUSES).optional(),
    supplierId: z.string().trim().min(1).optional(),
    createdFrom: dateFromSchema.optional(),
    createdTo: dateToSchema.optional(),
    sortBy: z.enum(["createdAt", "total"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .superRefine((value, ctx) => {
    if (value.createdFrom && value.createdTo && value.createdFrom > value.createdTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["createdFrom"],
        message: "createdFrom must be earlier than or equal to createdTo.",
      });
    }
  });

const orderIdSchema = z.object({
  orderId: z.string().trim().min(1),
});

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload, null, 2));
}

function normalizeError(error: unknown) {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError(
      error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  return new HttpError(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.");
}

async function readRequest(_request: IncomingMessage) {
  return undefined;
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  service: OrderService,
) {
  await readRequest(request);

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const method = request.method ?? "GET";

  if (method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      status: "ok",
      service: "supplier-order-engine-agentic-ai",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (method === "GET" && url.pathname === "/orders") {
    const input = listOrdersQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
    sendJson(response, 200, service.listOrders(input));
    return;
  }

  const orderMatch = /^\/orders\/([^/]+)$/.exec(url.pathname);

  if (method === "GET" && orderMatch) {
    const { orderId } = orderIdSchema.parse({ orderId: decodeURIComponent(orderMatch[1]) });
    sendJson(response, 200, service.getOrderById(orderId));
    return;
  }

  throw new HttpError(404, "ROUTE_NOT_FOUND", `Route ${method} ${url.pathname} was not found.`);
}

export function createAppServer(options: AppServerOptions = {}): Server {
  const service = options.service ?? new OrderService(createOrderRepository());
  const logger = options.logger ?? createLogger("info");

  return createServer(async (request, response) => {
    const requestId = randomUUID();
    const startedAt = Date.now();
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const method = request.method ?? "GET";

    try {
      await handleRequest(request, response, service);
    } catch (error) {
      const normalized = normalizeError(error);

      sendJson(response, normalized.statusCode, {
        error: {
          code: normalized.code,
          message: normalized.message,
          details: normalized.details ?? null,
        },
      });

      logger.error("request.failed", {
        requestId,
        method,
        path: url.pathname,
        statusCode: normalized.statusCode,
        errorCode: normalized.code,
      });
      return;
    }

    logger.info("request.completed", {
      requestId,
      method,
      path: url.pathname,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
}
