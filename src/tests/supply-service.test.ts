import assert from "node:assert/strict";
import { InMemorySupplyRepository } from "../supply-repository.js";
import { seedSupplies } from "../supply-seed-data.js";
import { SupplyService } from "../supply-service.js";

export function runSupplyServiceTests() {
  const service = new SupplyService(new InMemorySupplyRepository(seedSupplies));

  const filteredResult = service.listSupplies({
    page: 1,
    pageSize: 2,
    category: "Mechanical",
    sortBy: "name",
    sortOrder: "asc",
  });

  assert.equal(filteredResult.data.length, 1);
  assert.equal(filteredResult.pagination.totalItems, 1);
  assert.equal(filteredResult.data[0]?.name, "Cooling Fan");

  const detailResult = service.getSupplyById("SPL-1002");

  assert.equal(detailResult.data.id, "SPL-1002");
  assert.equal(detailResult.data.supplier.name, "Blue Ocean Logistics");

  const createdResult = service.createSupply({
    supplierId: "SUP-010",
    supplierName: "Future Parts",
    name: "Valve Kit",
    category: "Mechanical",
    quantityAvailable: 30,
    unitPrice: 49.9,
  });

  assert.equal(createdResult.data.id, "SPL-1005");
  assert.equal(createdResult.data.status, "AVAILABLE");
  assert.equal(createdResult.data.stock.quantityAvailable, 30);

  const updatedResult = service.updateSupply("SPL-1005", {
    quantityAvailable: 10,
    status: "LOW_STOCK",
  });

  assert.equal(updatedResult.data.stock.quantityAvailable, 10);
  assert.equal(updatedResult.data.status, "LOW_STOCK");

  const deletedResult = service.deleteSupply("SPL-1005");

  assert.equal(deletedResult.data.deleted, true);
  assert.throws(() => service.getSupplyById("SPL-1005"), {
    name: "SupplyNotFoundError",
  });
}
