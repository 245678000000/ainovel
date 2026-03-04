import { sanitize } from "./utils.ts";
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("sanitize redacts OpenAI API keys", () => {
  const input = "Error calling OpenAI: sk-1234567890abcdefghijklmnopqrstuvwxyz";
  const expected = "Error calling OpenAI: [REDACTED_API_KEY]";
  assertEquals(sanitize(input), expected);
});

Deno.test("sanitize redacts Anthropic API keys in JSON-like strings", () => {
  const input = '{"x-api-key": "ant-api-key-12345"}';
  const expected = '{"x-api-key: [REDACTED]"}';
  assertEquals(sanitize(input), expected);
});

Deno.test("sanitize redacts Authorization headers", () => {
  const input = "Authorization: Bearer my-secret-token";
  const expected = "Authorization: [REDACTED]";
  assertEquals(sanitize(input), expected);
});

Deno.test("sanitize redacts Bearer tokens directly", () => {
  const input = "Bearer some.jwt.token";
  const expected = "Bearer [REDACTED]";
  assertEquals(sanitize(input), expected);
});

Deno.test("sanitize redacts Error objects", () => {
  const error = new Error("Failed with sk-1234567890abcdefghijklmnopqrstuvwxyz");
  const sanitized = sanitize(error);
  assertEquals(sanitized instanceof Error, true);
  assertEquals(sanitized.message, "Failed with [REDACTED_API_KEY]");
});

Deno.test("sanitize redacts sensitive object keys", () => {
  const obj = {
    api_key: "my-secret-key",
    password: "secret-password",
    safe: "safe-value",
    nested: {
      token: "secret-token",
    },
  };
  const expected = {
    api_key: "[REDACTED]",
    password: "[REDACTED]",
    safe: "safe-value",
    nested: {
      token: "[REDACTED]",
    },
  };
  assertEquals(sanitize(obj), expected);
});
