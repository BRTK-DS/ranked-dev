import type { Challenge } from "./types";

const definitions: Record<string, { label: string; monaco: string; extension: string }> = {
  javascript: { label: "JavaScript", monaco: "javascript", extension: "js" },
  js: { label: "JavaScript", monaco: "javascript", extension: "js" },
  typescript: { label: "TypeScript", monaco: "typescript", extension: "ts" },
  ts: { label: "TypeScript", monaco: "typescript", extension: "ts" },
  php: { label: "PHP", monaco: "php", extension: "php" },
  "c#": { label: "C#", monaco: "csharp", extension: "cs" },
  csharp: { label: "C#", monaco: "csharp", extension: "cs" },
  html: { label: "HTML", monaco: "html", extension: "html" },
  xml: { label: "XML", monaco: "xml", extension: "xml" },
  xslt: { label: "XSLT", monaco: "xml", extension: "xsl" },
  xpath: { label: "XPath", monaco: "xpath", extension: "xpath" },
  graphql: { label: "GraphQL", monaco: "graphql", extension: "graphql" },
  sql: { label: "SQL", monaco: "sql", extension: "sql" },
  json: { label: "JSON", monaco: "json", extension: "json" },
};

export function getChallengeLanguage(challenge: Pick<Challenge, "language" | "title" | "initial_code">) {
  const explicit = challenge.language?.trim().toLowerCase();
  if (explicit && definitions[explicit]) return definitions[explicit];
  return { label: challenge.language || "Unknown", monaco: "plaintext", extension: "txt" };
}
