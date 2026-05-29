export function createOpenApiDocument() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Supplier Order Engine",
      version: "0.2.0",
      description: "HTTP service for supplier order listing and creation.",
    },
    servers: [{ url: "http://localhost:3000" }],
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          responses: {
            "200": {
              description: "Service is healthy.",
            },
          },
        },
      },
      "/orders": {
        get: {
          summary: "List orders",
          responses: {
            "200": {
              description: "Paginated order list.",
            },
          },
        },
        post: {
          summary: "Create order",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreateOrderRequest",
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Order created.",
            },
            "400": {
              description: "Invalid request.",
            },
          },
        },
      },
      "/orders/{orderId}": {
        get: {
          summary: "Get order detail",
          parameters: [
            {
              name: "orderId",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            "200": {
              description: "Order detail.",
            },
            "404": {
              description: "Order not found.",
            },
          },
        },
      },
      "/openapi.json": {
        get: {
          summary: "OpenAPI document",
          responses: {
            "200": {
              description: "Service OpenAPI document.",
            },
          },
        },
      },
      "/docs": {
        get: {
          summary: "Swagger UI",
          responses: {
            "200": {
              description: "Swagger UI HTML page.",
            },
          },
        },
      },
    },
    components: {
      schemas: {
        CreateOrderRequest: {
          type: "object",
          required: ["supplierId", "supplierName", "items"],
          properties: {
            supplierId: { type: "string", example: "SUP-005" },
            supplierName: { type: "string", example: "Acme Parts Supply" },
            currency: { type: "string", example: "EUR", default: "EUR" },
            items: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["sku", "name", "quantity", "unitPrice"],
                properties: {
                  sku: { type: "string", example: "ACM-VALVE-01" },
                  name: { type: "string", example: "Valve Kit" },
                  quantity: { type: "integer", minimum: 1, example: 2 },
                  unitPrice: { type: "number", minimum: 0.01, example: 49.9 },
                },
              },
            },
          },
        },
      },
    },
  };
}
