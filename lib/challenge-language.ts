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
  graphql: { label: "GraphQL", monaco: "graphql", extension: "graphql" },
  sql: { label: "SQL", monaco: "sql", extension: "sql" },
  json: { label: "JSON", monaco: "json", extension: "json" },
};

export function getChallengeLanguage(challenge: Pick<Challenge, "language" | "title" | "initial_code">) {
  const explicit = challenge.language?.trim().toLowerCase();
  if (explicit && definitions[explicit]) return definitions[explicit];
  const sample = `${challenge.title}\n${challenge.initial_code}`.toLowerCase();
  if (sample.includes("[php") || sample.includes("<?php")) return definitions.php;
  if (sample.includes("[c#") || sample.includes("using system")) return definitions["c#"];
  if (sample.includes("[graphql") || /\b(query|mutation)\s+\w+/.test(sample)) return definitions.graphql;
  if (sample.includes("[sql") || /\bselect\s.+\bfrom\b/.test(sample)) return definitions.sql;
  if (sample.includes("[xml") || sample.includes("<?xml")) return definitions.xml;
  if (sample.includes("[html") || /<(html|article|form)\b/.test(sample)) return definitions.html;
  if (sample.includes("typescript") || sample.includes("[ts]")) return definitions.typescript;
  return definitions.javascript;
}
