import assert from "node:assert/strict";
import { InMemoryOrderRepository } from "../order-repository.js";
import { OrderService } from "../order-service.js";
import { seedOrders } from "../seed-data.js";

export function runOrderServiceTests() {
  const service = new OrderService(new InMemoryOrderRepository(seedOrders));

  const filteredResult = service.listOrders({
    page: 1,
    pageSize: 1,
    supplierId: "SUP-002",
    sortBy: "total",
    sortOrder: "desc",
  });

  assert.equal(filteredResult.data.length, 1);
  assert.equal(filteredResult.pagination.totalItems, 2);
  assert.equal(filteredResult.pagination.totalPages, 2);
  assert.equal(filteredResult.data[0]?.id, "SO-1002");

  const detailResult = service.getOrderById("SO-1003");

  assert.equal(detailResult.data.id, "SO-1003");
  assert.equal(detailResult.data.items.length, 2);
  assert.equal(detailResult.data.supplier.name, "Northwind Components");

  assert.throws(() => service.getOrderById("SO-9999"), {
    name: "OrderNotFoundError",
  });
}
