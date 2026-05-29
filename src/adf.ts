type AdfNode = {
  type: string;
  text?: string;
  content?: AdfNode[];
};

export type AdfDocument = {
  type: "doc";
  version: 1;
  content: AdfNode[];
};

export function textToAdf(text: string): AdfDocument {
  const paragraphs = text
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map<AdfNode>((block) => ({
      type: "paragraph",
      content: [{ type: "text", text: block }],
    }));

  return {
    type: "doc",
    version: 1,
    content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph", content: [] }],
  };
}

export function adfToPlainText(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(adfToPlainText).filter(Boolean).join("\n");
  }

  if (typeof value !== "object") {
    return String(value);
  }

  const node = value as AdfNode;

  if (typeof node.text === "string") {
    return node.text;
  }

  const content = Array.isArray(node.content) ? node.content : [];
  const childText = content.map(adfToPlainText).filter(Boolean).join(node.type === "paragraph" ? "" : "\n");

  if (node.type === "paragraph") {
    return childText;
  }

  return childText;
}
