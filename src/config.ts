import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z
  .object({
    JIRA_BASE_URL: z.url(),
    JIRA_EMAIL: z.string().email().optional(),
    JIRA_API_TOKEN: z.string().min(1).optional(),
    JIRA_BEARER_TOKEN: z.string().min(1).optional(),
    JIRA_DEFAULT_PROJECT_KEY: z.string().trim().min(1).optional(),
    JIRA_DEFAULT_ISSUE_TYPE: z.string().trim().min(1).default("Task"),
  })
  .superRefine((value, ctx) => {
    const hasBasicAuth = Boolean(value.JIRA_EMAIL && value.JIRA_API_TOKEN);
    const hasBearer = Boolean(value.JIRA_BEARER_TOKEN);

    if (!hasBasicAuth && !hasBearer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Set either JIRA_EMAIL + JIRA_API_TOKEN or JIRA_BEARER_TOKEN to authenticate with Jira.",
      });
    }
  });

export type JiraConfig = {
  baseUrl: string;
  authHeader: string;
  defaultProjectKey?: string;
  defaultIssueType: string;
};

export function readConfig(): JiraConfig {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `- ${issue.message}`).join("\n");
    throw new Error(`Invalid Jira configuration:\n${message}`);
  }

  const env = parsed.data;
  const authHeader = env.JIRA_BEARER_TOKEN
    ? `Bearer ${env.JIRA_BEARER_TOKEN}`
    : `Basic ${Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64")}`;

  return {
    baseUrl: env.JIRA_BASE_URL.replace(/\/+$/, ""),
    authHeader,
    defaultProjectKey: env.JIRA_DEFAULT_PROJECT_KEY,
    defaultIssueType: env.JIRA_DEFAULT_ISSUE_TYPE,
  };
}
