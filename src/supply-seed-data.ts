import type { Supply, SupplyStatus } from "./domain.js";

type SeedSupplyInput = {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  category: string;
  status: SupplyStatus;
  quantityAvailable: number;
  unitPrice: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function buildSupply(input: SeedSupplyInput): Supply {
  return {
    id: input.id,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    name: input.name,
    category: input.category,
    status: input.status,
    quantityAvailable: input.quantityAvailable,
    unitPrice: roundMoney(input.unitPrice),
    currency: input.currency ?? "EUR",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export const seedSupplies: Supply[] = [
  buildSupply({
    id: "SPL-1001",
    supplierId: "SUP-001",
    supplierName: "Northwind Components",
    name: "Controller Board",
    category: "Electronics",
    status: "AVAILABLE",
    quantityAvailable: 45,
    unitPrice: 120,
    createdAt: "2026-05-15T08:00:00.000Z",
    updatedAt: "2026-05-28T09:15:00.000Z",
  }),
  buildSupply({
    id: "SPL-1002",
    supplierId: "SUP-002",
    supplierName: "Blue Ocean Logistics",
    name: "Packaging Kit",
    category: "Packaging",
    status: "LOW_STOCK",
    quantityAvailable: 8,
    unitPrice: 15,
    createdAt: "2026-05-16T10:30:00.000Z",
    updatedAt: "2026-05-28T14:10:00.000Z",
  }),
  buildSupply({
    id: "SPL-1003",
    supplierId: "SUP-003",
    supplierName: "Delta Raw Materials",
    name: "Aluminium Sheet",
    category: "Raw Materials",
    status: "AVAILABLE",
    quantityAvailable: 120,
    unitPrice: 8.4,
    createdAt: "2026-05-18T07:45:00.000Z",
    updatedAt: "2026-05-27T16:20:00.000Z",
  }),
  buildSupply({
    id: "SPL-1004",
    supplierId: "SUP-004",
    supplierName: "Vertex Industrial Supply",
    name: "Cooling Fan",
    category: "Mechanical",
    status: "DISCONTINUED",
    quantityAvailable: 0,
    unitPrice: 35,
    createdAt: "2026-05-20T11:00:00.000Z",
    updatedAt: "2026-05-25T13:00:00.000Z",
  }),
];
