import type { Order } from "./domain.js";
import { seedOrders } from "./seed-data.js";

export interface OrderRepository {
  list(): Order[];
  findById(orderId: string): Order | undefined;
}

export class InMemoryOrderRepository implements OrderRepository {
  constructor(private readonly orders: Order[]) {}

  list() {
    return this.orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({ ...item })),
    }));
  }

  findById(orderId: string) {
    const order = this.orders.find((entry) => entry.id === orderId);

    if (!order) {
      return undefined;
    }

    return {
      ...order,
      items: order.items.map((item) => ({ ...item })),
    };
  }
}

export function createOrderRepository() {
  return new InMemoryOrderRepository(seedOrders);
}
