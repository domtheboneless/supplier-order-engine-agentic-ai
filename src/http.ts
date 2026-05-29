import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { ZodError, z } from "zod";
import { BadRequestError, HttpError, ValidationError } from "./errors.js";
import { ORDER_STATUSES } from "./domain.js";
import { createLogger, type Logger } from "./logger.js";
import { createOpenApiDocument } from "./openapi.js";
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

const createOrderBodySchema = z.object({
  supplierId: z.string().trim().min(1),
  supplierName: z.string().trim().min(1),
  currency: z.string().trim().min(1).default("EUR"),
  items: z
    .array(
      z.object({
        sku: z.string().trim().min(1),
        name: z.string().trim().min(1),
        quantity: z.coerce.number().int().min(1),
        unitPrice: z.coerce.number().positive(),
      }),
    )
    .min(1),
});

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload, null, 2));
}

function sendHtml(response: ServerResponse, statusCode: number, html: string) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(html);
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
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];

    _request.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    _request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    _request.on("error", reject);
  });
}

function parseJsonBody<T>(payload: string): T {
  if (!payload.trim()) {
    throw new BadRequestError("EMPTY_BODY", "The request body is required.");
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new BadRequestError("INVALID_JSON", "The request body must be valid JSON.");
  }
}

function buildSwaggerHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Supplier Order Engine API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui"
      });
    </script>
  </body>
</html>`;
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  service: OrderService,
) {
  const body = await readRequest(request);

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

  if (method === "POST" && url.pathname === "/orders") {
    const input = createOrderBodySchema.parse(parseJsonBody(body));
    const created = service.createOrder(input);
    response.setHeader("Location", `/orders/${created.data.id}`);
    sendJson(response, 201, created);
    return;
  }

  const orderMatch = /^\/orders\/([^/]+)$/.exec(url.pathname);

  if (method === "GET" && orderMatch) {
    const { orderId } = orderIdSchema.parse({ orderId: decodeURIComponent(orderMatch[1]) });
    sendJson(response, 200, service.getOrderById(orderId));
    return;
  }

  if (method === "GET" && url.pathname === "/openapi.json") {
    sendJson(response, 200, createOpenApiDocument());
    return;
  }

  if (method === "GET" && url.pathname === "/docs") {
    sendHtml(response, 200, buildSwaggerHtml());
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
