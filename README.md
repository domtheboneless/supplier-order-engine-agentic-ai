# Supplier Order Engine

Servizio HTTP in TypeScript per la consultazione e creazione degli ordini, creato a partire dai task Jira `SOE-1` e `SOE-2`.

## Cosa fa

Espone questi endpoint REST:

- `GET /health`
- `GET /orders`
- `GET /orders/{orderId}`
- `POST /orders`
- `GET /openapi.json`
- `GET /docs`

Il servizio include:

- dataset seed iniziale per simulare la sorgente dati
- lista ordini con filtri, ordinamento e paginazione server-side
- dettaglio singolo ordine con righe articolo
- validazione input e gestione errori coerente
- logging minimale delle richieste
- test automatici unitari e di integrazione

## Requisiti

- Node.js 20 o superiore

## Configurazione

1. Copia `.env.example` in `.env`
2. Imposta le variabili desiderate

Variabili supportate:

- `PORT`
- `LOG_LEVEL` (`debug`, `info`, `warn`, `error`)

Esempio:

```env
PORT=3000
LOG_LEVEL=info
```

## Avvio

```bash
npm run build
npm start
```

Per sviluppo:

```bash
npm run dev
```

Per test:

```bash
npm test
```

## API

### `GET /orders`

Parametri supportati:

- `page`
- `pageSize`
- `status`
- `supplierId`
- `createdFrom`
- `createdTo`
- `sortBy` (`createdAt`, `total`)
- `sortOrder` (`asc`, `desc`)

Esempio:

```http
GET /orders?page=1&pageSize=2&status=PROCESSING&sortBy=createdAt&sortOrder=desc
```

Risposta:

```json
{
  "data": [
    {
      "id": "SO-1002",
      "status": "PROCESSING",
      "createdAt": "2026-05-18T08:30:00.000Z",
      "updatedAt": "2026-05-18T12:00:00.000Z",
      "supplier": {
        "id": "SUP-002",
        "name": "Blue Ocean Logistics"
      },
      "totals": {
        "subtotal": 900,
        "tax": 198,
        "total": 1098,
        "currency": "EUR"
      },
      "itemCount": 2
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 2,
    "totalItems": 1,
    "totalPages": 1
  },
  "filters": {
    "status": "PROCESSING",
    "supplierId": null,
    "createdFrom": null,
    "createdTo": null
  },
  "sort": {
    "by": "createdAt",
    "order": "desc"
  }
}
```

### `GET /orders/{orderId}`

Restituisce il dettaglio completo dell'ordine, incluse le righe articolo.

### `POST /orders`

Crea un nuovo ordine con stato iniziale `CREATED`.

Payload di esempio:

```json
{
  "supplierId": "SUP-010",
  "supplierName": "Future Parts",
  "currency": "EUR",
  "items": [
    {
      "sku": "FP-001",
      "name": "Sensor Board",
      "quantity": 2,
      "unitPrice": 50
    }
  ]
}
```

Risposta:

```json
{
  "data": {
    "id": "SO-1007",
    "status": "CREATED",
    "createdAt": "2026-05-29T13:00:00.000Z",
    "updatedAt": "2026-05-29T13:00:00.000Z",
    "supplier": {
      "id": "SUP-010",
      "name": "Future Parts"
    },
    "totals": {
      "subtotal": 100,
      "tax": 22,
      "total": 122,
      "currency": "EUR"
    },
    "itemCount": 1,
    "items": [
      {
        "sku": "FP-001",
        "name": "Sensor Board",
        "quantity": 2,
        "unitPrice": 50,
        "lineTotal": 100
      }
    ]
  }
}
```

## OpenAPI / Swagger

- `GET /openapi.json` espone il documento OpenAPI
- `GET /docs` espone una pagina Swagger UI puntata sul documento OpenAPI

## Gestione errori

- `400` per input non validi
- `404` per ordine non trovato o rotta inesistente
- `500` per errori inattesi

Formato errore:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "details": [
      {
        "path": "page",
        "message": "Too small: expected number to be >=1"
      }
    ]
  }
}
```
