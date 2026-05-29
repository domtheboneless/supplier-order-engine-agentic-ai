# Jira MCP Server

Server MCP locale per collegare un client compatibile MCP a Jira tramite REST API.

## Cosa fa

Espone questi tool:

- `jira_list_projects`
- `jira_get_issue`
- `jira_search_issues`
- `jira_create_issue`
- `jira_add_comment`
- `jira_list_transitions`
- `jira_transition_issue`

## Requisiti

- Node.js 20 o superiore
- Un'istanza Jira raggiungibile via HTTPS
- Credenziali Jira:
  - Jira Cloud: `JIRA_EMAIL` + `JIRA_API_TOKEN`
  - In alternativa: `JIRA_BEARER_TOKEN`

Atlassian per Jira Cloud raccomanda API token o OAuth; per uno strumento locale semplice questo progetto usa come default `email + API token`.

## Configurazione

1. Copia `.env.example` in `.env`
2. Inserisci i valori reali

Variabili supportate:

- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_BEARER_TOKEN`
- `JIRA_DEFAULT_PROJECT_KEY`
- `JIRA_DEFAULT_ISSUE_TYPE`

Esempio:

```env
JIRA_BASE_URL=https://acme.atlassian.net
JIRA_EMAIL=team@example.com
JIRA_API_TOKEN=...
JIRA_DEFAULT_PROJECT_KEY=OPS
JIRA_DEFAULT_ISSUE_TYPE=Task
```

## Avvio

```bash
npm install
npm run build
npm start
```

## Configurazione in un client MCP

Esempio generico:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["C:/Users/vito.sebastiani/Documents/AI - Question/build/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://acme.atlassian.net",
        "JIRA_EMAIL": "team@example.com",
        "JIRA_API_TOKEN": "your_api_token",
        "JIRA_DEFAULT_PROJECT_KEY": "OPS",
        "JIRA_DEFAULT_ISSUE_TYPE": "Task"
      }
    }
  }
}
```

Se preferisci usare il file `.env`, puoi avviare il server dalla cartella del progetto con `npm start`.

## Note utili

- Le descrizioni e i commenti vengono inviati a Jira in Atlassian Document Format (ADF), convertendo testo semplice in un documento base.
- Le risposte del server restituiscono sia testo leggibile sia `structuredContent`, utile ai client MCP che lo supportano.
- Il tool `jira_transition_issue` accetta `transitionId` oppure `transitionName`.
