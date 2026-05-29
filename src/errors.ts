export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class ValidationError extends HttpError {
  constructor(details?: unknown) {
    super(400, "VALIDATION_ERROR", "The request is invalid.", details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends HttpError {
  constructor(code: string, message: string, details?: unknown) {
    super(404, code, message, details);
    this.name = "NotFoundError";
  }
}

export class OrderNotFoundError extends NotFoundError {
  constructor(orderId: string) {
    super("ORDER_NOT_FOUND", `Order ${orderId} was not found.`, { orderId });
    this.name = "OrderNotFoundError";
  }
}
