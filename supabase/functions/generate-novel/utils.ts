
export function sanitize(input: any): any {
  if (typeof input === "string") {
    // Redact common API key patterns
    let sanitized = input;
    // OpenAI and others: sk-...
    sanitized = sanitized.replace(/sk-[a-zA-Z0-9]{20,}/g, "[REDACTED_API_KEY]");
    // Anthropic: x-api-key or other keys that might be in JSON
    sanitized = sanitized.replace(/(x-api-key|Authorization|api_key)["'\s:：]+([a-zA-Z0-9-._~+/ ]{10,})/gi, (match, p1, p2) => {
      return `${p1}: [REDACTED]`;
    });
    // Bearer tokens (specifically handling the value part)
    sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9-._~+/ ]+=*/gi, "Bearer [REDACTED]");
    return sanitized;
  }

  if (input instanceof Error) {
    const sanitizedError = new Error(sanitize(input.message));
    sanitizedError.name = input.name;
    sanitizedError.stack = sanitize(input.stack);
    return sanitizedError;
  }

  if (Array.isArray(input)) {
    return input.map(sanitize);
  }

  if (input !== null && typeof input === "object") {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = sanitize(key);
      if (
        /api_?key|password|token|secret|authorization/i.test(key) &&
        typeof value === "string"
      ) {
        sanitizedObj[sanitizedKey] = "[REDACTED]";
      } else {
        sanitizedObj[sanitizedKey] = sanitize(value);
      }
    }
    return sanitizedObj;
  }

  return input;
}
