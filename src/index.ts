import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readConfig } from "./config.js";
import { JiraApiError, JiraClient } from "./jira-client.js";

const config = readConfig();
const jira = new JiraClient(config);

const server = new McpServer({
  name: "jira-mcp-server",
  version: "0.1.0",
});

server.registerTool(
  "jira_list_projects",
  {
    title: "List Jira Projects",
    description: "List Jira projects visible to the authenticated user.",
    inputSchema: {
      maxResults: z.number().int().min(1).max(100).optional(),
      query: z.string().trim().min(1).optional(),
    },
  },
  async ({ maxResults, query }) => {
    return runTool(async () => {
      const projects = await jira.listProjects(maxResults, query);

      return {
        content: [
          {
            type: "text",
            text:
              projects.length === 0
                ? "No Jira projects found."
                : projects
                    .map((project) => `${project.key} - ${project.name}`)
                    .join("\n"),
          },
        ],
        structuredContent: {
          projects,
          count: projects.length,
        },
      };
    });
  },
);

server.registerTool(
  "jira_get_issue",
  {
    title: "Get Jira Issue",
    description: "Fetch a Jira issue by key and return a compact, readable summary.",
    inputSchema: {
      issueKey: z.string().trim().min(1),
      fields: z.array(z.string().trim().min(1)).optional(),
    },
  },
  async ({ issueKey, fields }) => {
    return runTool(async () => {
      const issue = await jira.getIssue(issueKey, fields);

      return {
        content: [
          {
            type: "text",
            text: formatIssue(issue),
          },
        ],
        structuredContent: issue,
      };
    });
  },
);

server.registerTool(
  "jira_search_issues",
  {
    title: "Search Jira Issues",
    description: "Search Jira issues with JQL.",
    inputSchema: {
      jql: z.string().trim().min(1),
      maxResults: z.number().int().min(1).max(50).optional(),
      fields: z.array(z.string().trim().min(1)).optional(),
    },
  },
  async ({ jql, maxResults, fields }) => {
    return runTool(async () => {
      const result = await jira.searchIssues(jql, maxResults, fields);
      const lines =
        result.issues.length === 0
          ? ["No issues matched the JQL query."]
          : result.issues.map(
              (issue) =>
                `${issue.key} [${issue.status ?? "Unknown"}] ${issue.summary} (${issue.url})`,
            );

      return {
        content: [
          {
            type: "text",
            text: lines.join("\n"),
          },
        ],
        structuredContent: result,
      };
    });
  },
);

server.registerTool(
  "jira_create_issue",
  {
    title: "Create Jira Issue",
    description: "Create a Jira issue in a project, optionally with labels and extra fields.",
    inputSchema: {
      projectKey: z.string().trim().min(1).optional(),
      summary: z.string().trim().min(1),
      description: z.string().trim().min(1).optional(),
      issueType: z.string().trim().min(1).optional(),
      labels: z.array(z.string().trim().min(1)).optional(),
      assigneeAccountId: z.string().trim().min(1).optional(),
      parentIssueKey: z.string().trim().min(1).optional(),
      extraFields: z.record(z.string(), z.unknown()).optional(),
    },
  },
  async (input) => {
    return runTool(async () => {
      const issue = await jira.createIssue(input);

      return {
        content: [
          {
            type: "text",
            text: `Created ${issue.key}: ${issue.url}`,
          },
        ],
        structuredContent: issue,
      };
    });
  },
);

server.registerTool(
  "jira_add_comment",
  {
    title: "Add Jira Comment",
    description: "Add a comment to a Jira issue.",
    inputSchema: {
      issueKey: z.string().trim().min(1),
      comment: z.string().trim().min(1),
    },
  },
  async ({ issueKey, comment }) => {
    return runTool(async () => {
      const result = await jira.addComment(issueKey, comment);

      return {
        content: [
          {
            type: "text",
            text: `Added comment ${result.id} to ${issueKey}.`,
          },
        ],
        structuredContent: result,
      };
    });
  },
);

server.registerTool(
  "jira_list_transitions",
  {
    title: "List Jira Transitions",
    description: "List the available workflow transitions for a Jira issue.",
    inputSchema: {
      issueKey: z.string().trim().min(1),
    },
  },
  async ({ issueKey }) => {
    return runTool(async () => {
      const transitions = await jira.listTransitions(issueKey);

      return {
        content: [
          {
            type: "text",
            text:
              transitions.length === 0
                ? `No transitions available for ${issueKey}.`
                : transitions
                    .map(
                      (transition) =>
                        `${transition.id} - ${transition.name} -> ${transition.targetStatus ?? "Unknown"}`,
                    )
                    .join("\n"),
          },
        ],
        structuredContent: {
          issueKey,
          transitions,
        },
      };
    });
  },
);

server.registerTool(
  "jira_transition_issue",
  {
    title: "Transition Jira Issue",
    description: "Move a Jira issue through a workflow transition by ID or name.",
    inputSchema: {
      issueKey: z.string().trim().min(1),
      transitionId: z.string().trim().min(1).optional(),
      transitionName: z.string().trim().min(1).optional(),
    },
  },
  async ({ issueKey, transitionId, transitionName }) => {
    return runTool(async () => {
      const result = await jira.transitionIssue(issueKey, { transitionId, transitionName });

      return {
        content: [
          {
            type: "text",
            text: `Transitioned ${issueKey} using transition ${result.transitionId}.`,
          },
        ],
        structuredContent: result,
      };
    });
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Jira MCP Server running on stdio");
}

void main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

async function runTool(action: () => Promise<{
  content: TextResultContent[];
  structuredContent?: Record<string, unknown>;
}>): Promise<ToolResponse> {
  try {
    return await action();
  } catch (error) {
    return {
      content: [textContent(formatError(error))],
      isError: true,
    };
  }
}

type TextResultContent = {
  type: "text";
  text: string;
};

type ToolResponse = {
  content: TextResultContent[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

function textContent(text: string): TextResultContent {
  return {
    type: "text",
    text,
  };
}

function formatIssue(issue: {
  key: string;
  url: string;
  summary: string;
  status: string | null;
  issueType: string | null;
  priority: string | null;
  assignee: string | null;
  reporter: string | null;
  created: string | null;
  updated: string | null;
  description: string;
  comments: Array<{ author: string | null; body: string }>;
}) {
  const commentPreview =
    issue.comments.length === 0
      ? "No comments"
      : issue.comments
          .slice(0, 3)
          .map((comment, index) => `${index + 1}. ${comment.author ?? "Unknown"}: ${comment.body}`)
          .join("\n");

  return [
    `${issue.key} - ${issue.summary}`,
    `URL: ${issue.url}`,
    `Status: ${issue.status ?? "Unknown"}`,
    `Type: ${issue.issueType ?? "Unknown"}`,
    `Priority: ${issue.priority ?? "Unknown"}`,
    `Assignee: ${issue.assignee ?? "Unassigned"}`,
    `Reporter: ${issue.reporter ?? "Unknown"}`,
    `Created: ${issue.created ?? "Unknown"}`,
    `Updated: ${issue.updated ?? "Unknown"}`,
    "",
    "Description:",
    issue.description || "(empty)",
    "",
    "Recent comments:",
    commentPreview,
  ].join("\n");
}

function formatError(error: unknown) {
  if (error instanceof JiraApiError) {
    return `${error.message}\n${JSON.stringify(error.details, null, 2)}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
