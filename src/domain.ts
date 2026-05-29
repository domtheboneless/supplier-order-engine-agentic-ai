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

export const SUPPLY_STATUSES = [
  "AVAILABLE",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "DISCONTINUED",
] as const;

export type SupplyStatus = (typeof SUPPLY_STATUSES)[number];
export type SupplySortBy = "updatedAt" | "quantityAvailable" | "name";

export type Supply = {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  category: string;
  status: SupplyStatus;
  quantityAvailable: number;
  unitPrice: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type ListSuppliesInput = {
  page: number;
  pageSize: number;
  status?: SupplyStatus;
  supplierId?: string;
  category?: string;
  sortBy: SupplySortBy;
  sortOrder: SortOrder;
};

export type CreateSupplyInput = {
  supplierId: string;
  supplierName: string;
  name: string;
  category: string;
  quantityAvailable: number;
  unitPrice: number;
  currency?: string;
  status?: SupplyStatus;
};

export type UpdateSupplyInput = {
  supplierId?: string;
  supplierName?: string;
  name?: string;
  category?: string;
  quantityAvailable?: number;
  unitPrice?: number;
  currency?: string;
  status?: SupplyStatus;
};
