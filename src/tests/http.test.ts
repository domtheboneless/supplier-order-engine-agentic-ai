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
  } finally {
    server.close();
  }
}
