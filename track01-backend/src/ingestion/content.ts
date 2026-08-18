function stringifyValue(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyValue(item))
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

export function extractContent(
  data: Record<string, unknown>,
): string {
  const contentFieldNames = Array.isArray(data.content_field_names)
    ? data.content_field_names.filter(
        (field): field is string => typeof field === "string",
      )
    : [];

  const chunks: string[] = [];

  // 1. Use dataset-provided content fields first.
  for (const field of contentFieldNames) {
    const value = data[field];

    if (value == null) {
      continue;
    }

    const text = stringifyValue(value).trim();

    if (text) {
      chunks.push(text);
    }
  }

  // 2. Fallbacks for documents without content_field_names.
  if (chunks.length === 0) {
    const fallbackFields = [
      "content",
      "body",
      "text",
      "description",
      "transcript",
      "message",
      "messages",
      "summary",
    ];

    for (const field of fallbackFields) {
      const value = data[field];

      if (value == null) {
        continue;
      }

      const text = stringifyValue(value).trim();

      if (text) {
        chunks.push(text);
      }
    }
  }

  return chunks.join("\n\n").trim();
}