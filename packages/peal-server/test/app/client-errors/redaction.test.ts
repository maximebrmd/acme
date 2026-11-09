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
        "No member sam+test@example.test in 5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60 with peal_synthetic-key-123"
      )
    ).toBe("No member [email] in [id] with [key]");
  });

  it("replaces the query and fragment of the addresses a text quotes", () => {
    expect(
      redactText(
        "Failed to fetch RSC payload for http://localhost:3001/reset-password?token=Synthetic0Reset1Token. Falling back to browser navigation."
      )
    ).toBe(
      "Failed to fetch RSC payload for http://localhost:3001/reset-password?[redacted]. Falling back to browser navigation."
    );
    expect(
      redactText(
        "Error: Synthetic\n    at render (https://app.example.test/_next/static/chunks/page.js?dpl=synthetic:12:5)"
      )
    ).toBe(
      "Error: Synthetic\n    at render (https://app.example.test/_next/static/chunks/page.js?[redacted]:12:5)"
    );
    expect(
      redactText("Loading /verify-email#access_token=synthetic failed")
    ).toBe("Loading /verify-email#[redacted] failed");
    // Prose keeps its question marks.
    expect(redactText("Is x?.y undefined? Yes")).toBe("Is x?.y undefined? Yes");
  });

  it("replaces the tokens a text quotes", () => {
    expect(
      redactText(
        "Invalid token eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InN5bnRoZXRpYyJ9.c2lnbmF0dXJl given"
      )
    ).toBe("Invalid token [token] given");
  });

  it("removes control characters, so a report cannot forge log lines", () => {
    expect(
      redacted({
        digest: "1\u001B[2J",
        kind: "uncaught",
        message: "Synthetic\r\n[ERROR] forged line\u001B[31m\u202E",
        path: "/app",
        release: "2026\n11",
        route: "/[locale]/app\r\nforged",
        stack: "Error: Synthetic\n    at page.js:1:2\u0000",
        userAgent: "Mozilla/5.0\u0007 (Synthetic)",
      })
    ).toStrictEqual({
      digest: "1[2J",
      kind: "uncaught",
      message: "Synthetic\n[ERROR] forged line[31m",
      path: "/app",
      release: "202611",
      route: "/[locale]/appforged",
      stack: "Error: Synthetic\n    at page.js:1:2",
      userAgent: "Mozilla/5.0 (Synthetic)",
    });
  });

  it("names nobody in any field of a report", () => {
    const report = redacted({
      digest: "sam@example.test",
      kind: "server",
      message: "Synthetic",
      path: "/app",
      release: "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60",
      route: "/[locale]/app/sam@example.test",
      stack: null,
      userAgent: "Mozilla/5.0 (peal_synthetic-key-123)",
    });

    expect(report).toMatchObject({
      digest: "[email]",
      release: "[id]",
      route: "/[locale]/app/[email]",
      userAgent: "Mozilla/5.0 ([key])",
    });
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
