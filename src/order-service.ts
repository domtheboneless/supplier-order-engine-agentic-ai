import type { CreateOrderInput, CreateOrderItemInput, ListOrdersInput, Order, OrderItem } from "./domain.js";
import { OrderNotFoundError } from "./errors.js";
import type { OrderRepository } from "./order-repository.js";

const DEFAULT_CURRENCY = "EUR";
const DEFAULT_TAX_RATE = 0.22;

function compareValues(left: number | string, right: number | string, order: "asc" | "desc") {
  const factor = order === "asc" ? 1 : -1;

  if (left < right) {
    return -1 * factor;
  }

  if (left > right) {
    return 1 * factor;
  }

  return 0;
}

function mapSummary(order: Order) {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    supplier: {
      id: order.supplierId,
      name: order.supplierName,
    },
    totals: {
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      currency: order.currency,
    },
    itemCount: order.items.length,
  };
}

function mapDetail(order: Order) {
  return {
    ...mapSummary(order),
    items: order.items,
  };
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function mapCreateItem(item: CreateOrderItemInput): OrderItem {
  return {
    ...item,
    lineTotal: roundMoney(item.quantity * item.unitPrice),
  };
}

function getNextOrderId(existingOrders: Order[]) {
  const currentMax = existingOrders.reduce((max, order) => {
    const match = /^SO-(\d+)$/.exec(order.id);

    if (!match) {
      return max;
    }

    return Math.max(max, Number(match[1]));
  }, 1000);

  return `SO-${currentMax + 1}`;
}

export class OrderService {
  constructor(private readonly repository: OrderRepository) {}

  listOrders(input: ListOrdersInput) {
    const filtered = this.repository
      .list()
      .filter((order) => !input.status || order.status === input.status)
      .filter((order) => !input.supplierId || order.supplierId === input.supplierId)
      .filter((order) => !input.createdFrom || order.createdAt >= input.createdFrom)
      .filter((order) => !input.createdTo || order.createdAt <= input.createdTo)
      .sort((left, right) => {
        if (input.sortBy === "total") {
          return compareValues(left.total, right.total, input.sortOrder);
        }

        return compareValues(left.createdAt, right.createdAt, input.sortOrder);
      });

    const totalItems = filtered.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / input.pageSize);
    const startIndex = (input.page - 1) * input.pageSize;
    const endIndex = startIndex + input.pageSize;

    return {
      data: filtered.slice(startIndex, endIndex).map(mapSummary),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        totalItems,
        totalPages,
      },
      filters: {
        status: input.status ?? null,
        supplierId: input.supplierId ?? null,
        createdFrom: input.createdFrom ?? null,
        createdTo: input.createdTo ?? null,
      },
      sort: {
        by: input.sortBy,
        order: input.sortOrder,
      },
    };
  }

  getOrderById(orderId: string) {
    const order = this.repository.findById(orderId);

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    return {
      data: mapDetail(order),
    };
  }

  createOrder(input: CreateOrderInput) {
    const items = input.items.map(mapCreateItem);
    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
    const tax = roundMoney(subtotal * DEFAULT_TAX_RATE);
    const total = roundMoney(subtotal + tax);
    const now = new Date().toISOString();
    const existingOrders = this.repository.list();

    const order: Order = {
      id: getNextOrderId(existingOrders),
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      status: "CREATED",
      createdAt: now,
      updatedAt: now,
      currency: input.currency ?? DEFAULT_CURRENCY,
      subtotal,
      tax,
      total,
      items,
    };

    return {
      data: mapDetail(this.repository.create(order)),
    };
  }
}
