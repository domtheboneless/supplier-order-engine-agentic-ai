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

  const createdResult = service.createOrder({
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

  assert.equal(createdResult.data.status, "CREATED");
  assert.equal(createdResult.data.id, "SO-1007");
  assert.equal(createdResult.data.totals.subtotal, 100);
  assert.equal(createdResult.data.totals.tax, 22);
  assert.equal(createdResult.data.totals.total, 122);
  assert.equal(service.getOrderById("SO-1007").data.supplier.name, "Future Parts");

  assert.throws(() => service.getOrderById("SO-9999"), {
    name: "OrderNotFoundError",
  });
}
