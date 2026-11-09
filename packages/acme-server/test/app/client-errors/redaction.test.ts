import { describe, expect, it } from "@effect/vitest";

import {
  redactPath,
  redacted,
  redactText,
} from "#app/client-errors/redaction.ts";

describe("what the server keeps of an error report", () => {
  it("replaces the ids in a path", () => {
    expect(
      redactPath(
        "/fr/app/5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60/posts/0190f0c5-7a1e-7b2c-8d3e-4f5a6b7c8d9e"
      )
    ).toBe("/fr/app/:id/posts/:id");
    expect(redactPath("/data-deletion/1234567890")).toBe("/data-deletion/:id");
    expect(redactPath("/invitations/aBcDeFgHiJkLmNoPqRsTuVwXyZ012345")).toBe(
      "/invitations/:id"
    );
    expect(redactPath("/app/notices/preferences")).toBe(
      "/app/notices/preferences"
    );
  });

  it("replaces the addresses, ids and keys a message quotes", () => {
    expect(
      redactText(
        "No member sam+test@example.test in 5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60 with acme_synthetic-key-123"
      )
    ).toBe("No member [email] in [id] with [key]");
  });

  it("keeps everything else of a report", () => {
    expect(
      redacted({
        digest: "2154981321",
        kind: "boundary",
        message: "Cannot read properties of undefined",
        path: "/app",
        release: "2026.11.0",
        route: "/[locale]/app",
        stack: "TypeError: at render (page.js:1:2)",
        userAgent: "Mozilla/5.0 (Synthetic)",
      })
    ).toStrictEqual({
      digest: "2154981321",
      kind: "boundary",
      message: "Cannot read properties of undefined",
      path: "/app",
      release: "2026.11.0",
      route: "/[locale]/app",
      stack: "TypeError: at render (page.js:1:2)",
      userAgent: "Mozilla/5.0 (Synthetic)",
    });
  });
});
