import { adfToPlainText, textToAdf } from "./adf.js";
import type { JiraConfig } from "./config.js";

type JiraProject = {
  id: string;
  key: string;
  name: string;
  projectTypeKey?: string;
  simplified?: boolean;
  style?: string;
};

type JiraIssueFields = {
  summary?: string;
  description?: unknown;
  status?: { name?: string };
  issuetype?: { id?: string; name?: string };
  priority?: { name?: string };
  assignee?: { displayName?: string; accountId?: string };
  reporter?: { displayName?: string; accountId?: string };
  labels?: string[];
  created?: string;
  updated?: string;
  comment?: {
    comments?: Array<{
      id: string;
      author?: { displayName?: string };
      created?: string;
      body?: unknown;
    }>;
  };
};

type JiraIssue = {
  id: string;
  key: string;
  self?: string;
  fields?: JiraIssueFields;
};

type JiraTransition = {
  id: string;
  name: string;
  to?: {
    name?: string;
    statusCategory?: {
      name?: string;
    };
  };
};

export class JiraApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

export class JiraClient {
  constructor(private readonly config: JiraConfig) {}

  async listProjects(maxResults = 50, query?: string) {
    const params = new URLSearchParams({
      maxResults: String(maxResults),
    });

    if (query) {
      params.set("query", query);
    }

    const response = await this.request<{ values?: JiraProject[] }>(
      `/rest/api/3/project/search?${params.toString()}`,
    );

    return (response.values ?? []).map((project) => ({
      id: project.id,
      key: project.key,
      name: project.name,
      projectType: project.projectTypeKey ?? null,
      simplified: project.simplified ?? null,
      style: project.style ?? null,
    }));
  }

  async getIssue(issueKey: string, fields?: string[]) {
    const params = new URLSearchParams();

    if (fields && fields.length > 0) {
      params.set("fields", fields.join(","));
    }

    const suffix = params.toString();
    const issue = await this.request<JiraIssue>(
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}${suffix ? `?${suffix}` : ""}`,
    );

    return normalizeIssue(issue, this.config.baseUrl);
  }

  async searchIssues(jql: string, maxResults = 10, fields?: string[]) {
    const response = await this.request<{ issues?: JiraIssue[]; total?: number }>(
      "/rest/api/3/search",
      {
        method: "POST",
        body: JSON.stringify({
          jql,
          maxResults,
          fields:
            fields && fields.length > 0
              ? fields
              : ["summary", "status", "issuetype", "priority", "assignee", "updated"],
        }),
      },
    );

    return {
      total: response.total ?? 0,
      issues: (response.issues ?? []).map((issue) => normalizeIssue(issue, this.config.baseUrl)),
    };
  }

  async createIssue(input: {
    projectKey?: string;
    summary: string;
    description?: string;
    issueType?: string;
    labels?: string[];
    assigneeAccountId?: string;
    parentIssueKey?: string;
    extraFields?: Record<string, unknown>;
  }) {
    const projectKey = input.projectKey ?? this.config.defaultProjectKey;

    if (!projectKey) {
      throw new Error(
        "projectKey is required. Pass it explicitly or set JIRA_DEFAULT_PROJECT_KEY in the environment.",
      );
    }

    const payload: Record<string, unknown> = {
      project: { key: projectKey },
      summary: input.summary,
      issuetype: { name: input.issueType ?? this.config.defaultIssueType },
    };

    if (input.description) {
      payload.description = textToAdf(input.description);
    }

    if (input.labels && input.labels.length > 0) {
      payload.labels = input.labels;
    }

    if (input.assigneeAccountId) {
      payload.assignee = { accountId: input.assigneeAccountId };
    }

    if (input.parentIssueKey) {
      payload.parent = { key: input.parentIssueKey };
    }

    const issue = await this.request<{ id: string; key: string; self: string }>(
      "/rest/api/3/issue",
      {
        method: "POST",
        body: JSON.stringify({
          fields: {
            ...payload,
            ...(input.extraFields ?? {}),
          },
        }),
      },
    );

    return {
      id: issue.id,
      key: issue.key,
      url: `${this.config.baseUrl}/browse/${issue.key}`,
      self: issue.self,
    };
  }

  async addComment(issueKey: string, comment: string) {
    const response = await this.request<{ id: string; self: string }>(
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`,
      {
        method: "POST",
        body: JSON.stringify({
          body: textToAdf(comment),
        }),
      },
    );

    return {
      id: response.id,
      issueKey,
      self: response.self,
    };
  }

  async listTransitions(issueKey: string) {
    const response = await this.request<{ transitions?: JiraTransition[] }>(
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
    );

    return (response.transitions ?? []).map((transition) => ({
      id: transition.id,
      name: transition.name,
      targetStatus: transition.to?.name ?? null,
      category: transition.to?.statusCategory?.name ?? null,
    }));
  }

  async transitionIssue(issueKey: string, input: { transitionId?: string; transitionName?: string }) {
    let transitionId = input.transitionId;

    if (!transitionId && input.transitionName) {
      const transitions = await this.listTransitions(issueKey);
      const matched = transitions.find(
        (transition) => transition.name.toLowerCase() === input.transitionName?.toLowerCase(),
      );

      if (!matched) {
        throw new Error(
          `No transition named "${input.transitionName}" is available for issue ${issueKey}.`,
        );
      }

      transitionId = matched.id;
    }

    if (!transitionId) {
      throw new Error("Provide either transitionId or transitionName.");
    }

    await this.request(
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
      {
        method: "POST",
        body: JSON.stringify({
          transition: { id: transitionId },
        }),
      },
    );

    return {
      issueKey,
      transitionId,
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: this.config.authHeader,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      let details: unknown;

      try {
        details = await response.json();
      } catch {
        details = await response.text();
      }

      throw new JiraApiError(
        `Jira API request failed with status ${response.status}.`,
        response.status,
        details,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}

function normalizeIssue(issue: JiraIssue, baseUrl: string) {
  const fields = issue.fields ?? {};
  const description = adfToPlainText(fields.description);
  const comments = fields.comment?.comments ?? [];

  return {
    id: issue.id,
    key: issue.key,
    url: `${baseUrl}/browse/${issue.key}`,
    summary: fields.summary ?? "",
    description,
    status: fields.status?.name ?? null,
    issueType: fields.issuetype?.name ?? null,
    priority: fields.priority?.name ?? null,
    assignee: fields.assignee?.displayName ?? null,
    reporter: fields.reporter?.displayName ?? null,
    labels: fields.labels ?? [],
    created: fields.created ?? null,
    updated: fields.updated ?? null,
    comments: comments.map((comment) => ({
      id: comment.id,
      author: comment.author?.displayName ?? null,
      created: comment.created ?? null,
      body: adfToPlainText(comment.body),
    })),
  };
}
