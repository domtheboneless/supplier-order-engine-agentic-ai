export const ORDER_STATUSES = [
  "CREATED",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderSortBy = "createdAt" | "total";
export type SortOrder = "asc" | "desc";

export type OrderItem = {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CreateOrderItemInput = {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  supplierId: string;
  supplierName: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  items: OrderItem[];
};

export type ListOrdersInput = {
  page: number;
  pageSize: number;
  status?: OrderStatus;
  supplierId?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy: OrderSortBy;
  sortOrder: SortOrder;
};

export type CreateOrderInput = {
  supplierId: string;
  supplierName: string;
  currency?: string;
  items: CreateOrderItemInput[];
};
