import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { createAppServer } from "../http.js";
import { createLogger } from "../logger.js";
import { InMemoryOrderRepository } from "../order-repository.js";
import { OrderService } from "../order-service.js";
import { seedOrders } from "../seed-data.js";

function buildUrl(serverAddress: AddressInfo, path: string) {
  return `http://127.0.0.1:${serverAddress.port}${path}`;
}

function requestJson(url: string): Promise<{ statusCode: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      const chunks: Buffer[] = [];

      response.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      response.on("end", () => {
        const payload = Buffer.concat(chunks).toString("utf8");

        try {
          resolve({
            statusCode: response.statusCode ?? 0,
            body: JSON.parse(payload),
          });
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on("error", reject);
  });
}

function postJson(
  url: string,
  payload: unknown,
): Promise<{ statusCode: number; body: unknown; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const serialized = JSON.stringify(payload);
    const request = http.request(
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(serialized),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on("end", () => {
          const responseBody = Buffer.concat(chunks).toString("utf8");

          try {
            resolve({
              statusCode: response.statusCode ?? 0,
              body: JSON.parse(responseBody),
              headers: response.headers,
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.on("error", reject);
    request.write(serialized);
    request.end();
  });
}

export async function runHttpTests() {
  const server = createAppServer({
    logger: createLogger("error"),
    service: new OrderService(new InMemoryOrderRepository(seedOrders)),
  });

  server.listen(0);
  await once(server, "listening");

  const address = server.address() as AddressInfo;

  try {
    const listResponse = await requestJson(
      buildUrl(address, "/orders?page=1&pageSize=2&sortBy=createdAt&sortOrder=desc"),
    );
    const listPayload = listResponse.body as {
      data: Array<{ id: string }>;
      pagination: { totalItems: number };
    };

    assert.equal(listResponse.statusCode, 200);
    assert.equal(listPayload.data.length, 2);
    assert.equal(listPayload.pagination.totalItems, 6);

    const validationResponse = await requestJson(buildUrl(address, "/orders?page=0"));
    const validationPayload = validationResponse.body as {
      error: { code: string };
    };

    assert.equal(validationResponse.statusCode, 400);
    assert.equal(validationPayload.error.code, "VALIDATION_ERROR");

    const missingOrderResponse = await requestJson(buildUrl(address, "/orders/SO-404"));
    const missingOrderPayload = missingOrderResponse.body as {
      error: { code: string };
    };

    assert.equal(missingOrderResponse.statusCode, 404);
    assert.equal(missingOrderPayload.error.code, "ORDER_NOT_FOUND");

    const createResponse = await postJson(buildUrl(address, "/orders"), {
      supplierId: "SUP-010",
      supplierName: "Future Parts",
      items: [
        {
          sku: "FP-001",
          name: "Sensor Board",
          quantity: 2,
          unitPrice: 50,
        },
      ],
    });
    const createPayload = createResponse.body as {
      data: { id: string; totals: { total: number } };
    };

    assert.equal(createResponse.statusCode, 201);
    assert.equal(createPayload.data.id, "SO-1007");
    assert.equal(createPayload.data.totals.total, 122);
    assert.equal(createResponse.headers.location, "/orders/SO-1007");

    const createdDetailResponse = await requestJson(buildUrl(address, "/orders/SO-1007"));
    const createdDetailPayload = createdDetailResponse.body as {
      data: { supplier: { name: string } };
    };

    assert.equal(createdDetailResponse.statusCode, 200);
    assert.equal(createdDetailPayload.data.supplier.name, "Future Parts");

    const invalidCreateResponse = await postJson(buildUrl(address, "/orders"), {
      supplierId: "",
      supplierName: "Broken Supplier",
      items: [],
    });
    const invalidCreatePayload = invalidCreateResponse.body as {
      error: { code: string };
    };

    assert.equal(invalidCreateResponse.statusCode, 400);
    assert.equal(invalidCreatePayload.error.code, "VALIDATION_ERROR");

    const openApiResponse = await requestJson(buildUrl(address, "/openapi.json"));
    const openApiPayload = openApiResponse.body as {
      paths: Record<string, { post?: unknown }>;
    };

    assert.equal(openApiResponse.statusCode, 200);
    assert.ok(openApiPayload.paths["/orders"]?.post);
  } finally {
    server.close();
  }
}
