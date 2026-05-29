export function createOpenApiDocument() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Supplier Order Engine",
      version: "0.3.0",
      description: "HTTP service for supplier orders and supplies management.",
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
      "/supplies": {
        get: {
          summary: "List supplies",
          responses: {
            "200": {
              description: "Paginated supply list.",
            },
          },
        },
        post: {
          summary: "Create supply",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreateSupplyRequest",
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Supply created.",
            },
            "400": {
              description: "Invalid request.",
            },
          },
        },
      },
      "/supplies/{supplyId}": {
        get: {
          summary: "Get supply detail",
          parameters: [
            {
              name: "supplyId",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            "200": {
              description: "Supply detail.",
            },
            "404": {
              description: "Supply not found.",
            },
          },
        },
        put: {
          summary: "Update supply",
          parameters: [
            {
              name: "supplyId",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UpdateSupplyRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Supply updated.",
            },
            "400": {
              description: "Invalid request.",
            },
            "404": {
              description: "Supply not found.",
            },
          },
        },
        delete: {
          summary: "Delete supply",
          parameters: [
            {
              name: "supplyId",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            "200": {
              description: "Supply deleted.",
            },
            "404": {
              description: "Supply not found.",
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
        CreateSupplyRequest: {
          type: "object",
          required: [
            "supplierId",
            "supplierName",
            "name",
            "category",
            "quantityAvailable",
            "unitPrice",
          ],
          properties: {
            supplierId: { type: "string", example: "SUP-005" },
            supplierName: { type: "string", example: "Acme Parts Supply" },
            name: { type: "string", example: "Valve Kit" },
            category: { type: "string", example: "Mechanical" },
            quantityAvailable: { type: "integer", minimum: 0, example: 25 },
            unitPrice: { type: "number", minimum: 0.01, example: 49.9 },
            currency: { type: "string", example: "EUR", default: "EUR" },
            status: {
              type: "string",
              enum: ["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK", "DISCONTINUED"],
              example: "AVAILABLE",
            },
          },
        },
        UpdateSupplyRequest: {
          type: "object",
          minProperties: 1,
          properties: {
            supplierId: { type: "string", example: "SUP-005" },
            supplierName: { type: "string", example: "Acme Parts Supply" },
            name: { type: "string", example: "Valve Kit Plus" },
            category: { type: "string", example: "Mechanical" },
            quantityAvailable: { type: "integer", minimum: 0, example: 12 },
            unitPrice: { type: "number", minimum: 0.01, example: 54.5 },
            currency: { type: "string", example: "EUR" },
            status: {
              type: "string",
              enum: ["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK", "DISCONTINUED"],
              example: "LOW_STOCK",
            },
          },
        },
      },
    },
  };
}
