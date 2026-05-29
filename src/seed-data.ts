import type { Order, OrderItem, OrderStatus } from "./domain.js";

type SeedItem = {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type SeedOrderInput = {
  id: string;
  supplierId: string;
  supplierName: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  taxRate: number;
  items: SeedItem[];
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function buildOrder(input: SeedOrderInput): Order {
  const items: OrderItem[] = input.items.map((item) => ({
    ...item,
    lineTotal: roundMoney(item.quantity * item.unitPrice),
  }));

  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const tax = roundMoney(subtotal * input.taxRate);
  const total = roundMoney(subtotal + tax);

  return {
    id: input.id,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    status: input.status,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    currency: "EUR",
    subtotal,
    tax,
    total,
    items,
  };
}

export const seedOrders: Order[] = [
  buildOrder({
    id: "SO-1001",
    supplierId: "SUP-001",
    supplierName: "Northwind Components",
    status: "CREATED",
    createdAt: "2026-05-15T09:00:00.000Z",
    updatedAt: "2026-05-15T09:15:00.000Z",
    taxRate: 0.22,
    items: [
      { sku: "NW-CPU-01", name: "Controller Board", quantity: 5, unitPrice: 120 },
      { sku: "NW-CBL-09", name: "Shielded Cable", quantity: 10, unitPrice: 12.5 },
    ],
  }),
  buildOrder({
    id: "SO-1002",
    supplierId: "SUP-002",
    supplierName: "Blue Ocean Logistics",
    status: "PROCESSING",
    createdAt: "2026-05-18T08:30:00.000Z",
    updatedAt: "2026-05-18T12:00:00.000Z",
    taxRate: 0.22,
    items: [
      { sku: "BOL-PACK-11", name: "Packaging Kit", quantity: 20, unitPrice: 15 },
      { sku: "BOL-SCAN-03", name: "Scanner Module", quantity: 3, unitPrice: 200 },
    ],
  }),
  buildOrder({
    id: "SO-1003",
    supplierId: "SUP-001",
    supplierName: "Northwind Components",
    status: "SHIPPED",
    createdAt: "2026-05-20T14:20:00.000Z",
    updatedAt: "2026-05-21T07:45:00.000Z",
    taxRate: 0.22,
    items: [
      { sku: "NW-DRV-05", name: "Drive Unit", quantity: 2, unitPrice: 460 },
      { sku: "NW-SNS-07", name: "Thermal Sensor", quantity: 8, unitPrice: 45 },
    ],
  }),
  buildOrder({
    id: "SO-1004",
    supplierId: "SUP-003",
    supplierName: "Delta Raw Materials",
    status: "DELIVERED",
    createdAt: "2026-05-22T10:05:00.000Z",
    updatedAt: "2026-05-24T16:30:00.000Z",
    taxRate: 0.22,
    items: [
      { sku: "DRM-ALU-12", name: "Aluminium Sheet", quantity: 50, unitPrice: 8.4 },
      { sku: "DRM-RVT-01", name: "Rivet Pack", quantity: 100, unitPrice: 0.75 },
    ],
  }),
  buildOrder({
    id: "SO-1005",
    supplierId: "SUP-004",
    supplierName: "Vertex Industrial Supply",
    status: "CANCELLED",
    createdAt: "2026-05-25T11:40:00.000Z",
    updatedAt: "2026-05-25T13:00:00.000Z",
    taxRate: 0.22,
    items: [
      { sku: "VIS-MOT-21", name: "Motor Assembly", quantity: 1, unitPrice: 980 },
      { sku: "VIS-FAN-04", name: "Cooling Fan", quantity: 6, unitPrice: 35 },
    ],
  }),
  buildOrder({
    id: "SO-1006",
    supplierId: "SUP-002",
    supplierName: "Blue Ocean Logistics",
    status: "CONFIRMED",
    createdAt: "2026-05-27T07:15:00.000Z",
    updatedAt: "2026-05-27T08:30:00.000Z",
    taxRate: 0.22,
    items: [
      { sku: "BOL-LBL-01", name: "Label Roll", quantity: 40, unitPrice: 3.25 },
      { sku: "BOL-HND-08", name: "Handheld Terminal", quantity: 4, unitPrice: 185 },
    ],
  }),
];
