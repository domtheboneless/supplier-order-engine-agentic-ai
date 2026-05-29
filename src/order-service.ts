import type { ListOrdersInput, Order } from "./domain.js";
import { OrderNotFoundError } from "./errors.js";
import type { OrderRepository } from "./order-repository.js";

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
}
