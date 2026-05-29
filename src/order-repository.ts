import type { Order } from "./domain.js";
import { seedOrders } from "./seed-data.js";

function cloneOrder(order: Order): Order {
  return {
    ...order,
    items: order.items.map((item) => ({ ...item })),
  };
}

export interface OrderRepository {
  list(): Order[];
  findById(orderId: string): Order | undefined;
  create(order: Order): Order;
}

export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders: Order[];

  constructor(orders: Order[]) {
    this.orders = orders.map(cloneOrder);
  }

  list() {
    return this.orders.map(cloneOrder);
  }

  findById(orderId: string) {
    const order = this.orders.find((entry) => entry.id === orderId);

    if (!order) {
      return undefined;
    }

    return cloneOrder(order);
  }

  create(order: Order) {
    this.orders.push(cloneOrder(order));
    return cloneOrder(order);
  }
}

export function createOrderRepository() {
  return new InMemoryOrderRepository(seedOrders);
}
