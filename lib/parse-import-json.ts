const CODE_FENCE = /^```(?:json|javascript|js)?\s*([\s\S]*?)\s*```$/i;
const ASSIGNMENT_PREFIX = /^(?:(?:export\s+default|module\.exports)\s*=|(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=)\s*/;

/** Accept JSON copied directly from a file or wrapped in a Markdown/JS code block. */
export function parseImportJson(source: string): unknown {
  let normalized = source.replace(/^\uFEFF/, "").trim();
  const fenced = normalized.match(CODE_FENCE);

  if (fenced) normalized = fenced[1].trim();
  normalized = normalized.replace(ASSIGNMENT_PREFIX, "").trim();
  normalized = normalized.replace(/;\s*$/, "").trim();

  return JSON.parse(normalized);
}
