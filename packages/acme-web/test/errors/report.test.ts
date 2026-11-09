import { describe, expect, it } from "@effect/vitest";
import { ClientErrorReportSchema, clientErrorLimits } from "acme-contract";
import { Schema } from "effect";

import { pathOf, reportOf } from "#errors/report.ts";
import type { ErrorPlace } from "#errors/report.ts";

const place: ErrorPlace = {
  kind: "uncaught",
  page: "/app",
  release: "2026.11.0",
  route: null,
  userAgent: "Mozilla/5.0 (Synthetic)",
};

const isReport = Schema.is(ClientErrorReportSchema);

describe(reportOf, () => {
  it("reads an error's message and stack", () => {
    const error = new TypeError("Cannot read properties of undefined");

    const report = reportOf(error, place);

    expect(report.message).toBe("Cannot read properties of undefined");
    expect(report.stack).toContain("TypeError");
    expect(report.digest).toBeNull();
    expect(isReport(report)).toBeTruthy();
  });

  it("reads what was thrown when it is not an error", () => {
    expect(reportOf("Synthetic rejection", place).message).toBe(
      "Synthetic rejection"
    );
    expect(reportOf({ reason: 42 }, place)).toMatchObject({
      message: "A value that is not an error was thrown",
      stack: null,
    });
    const blank = new Error("Synthetic");

    blank.message = "";

    expect(reportOf(blank, place).message).toBe("Error");
  });

  it("keeps Next's digest of a server error", () => {
    const error = Object.assign(new Error("An error occurred"), {
      digest: "2154981321",
    });

    expect(reportOf(error, place).digest).toBe("2154981321");
  });

  it("names nobody: no address, id or key it quotes", () => {
    const report = reportOf(
      new Error(
        "No member sam@example.test in 5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60, key acme_synthetic_123"
      ),
      {
        ...place,
        page: "/fr/app/5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60/posts/new?draft=1#top",
      }
    );

    expect(report.message).toBe("No member [email] in [id], key [key]");
    expect(report.path).toBe("/fr/app/:id/posts/new");
    expect(report.stack).not.toContain("sam@example.test");
  });

  it("cuts every field to what the server reads", () => {
    const error = new Error("x".repeat(5000));

    error.stack = "y".repeat(50_000);

    const report = reportOf(error, {
      ...place,
      page: "/ab".repeat(2000),
      release: "r".repeat(500),
      route: `/${"q".repeat(500)}`,
      userAgent: "u".repeat(5000),
    });

    expect({
      message: report.message.length,
      path: report.path.length,
      release: report.release.length,
      route: report.route?.length,
      stack: report.stack?.length,
      userAgent: report.userAgent?.length,
    }).toStrictEqual({
      message: clientErrorLimits.message,
      path: clientErrorLimits.path,
      release: clientErrorLimits.release,
      route: clientErrorLimits.route,
      stack: clientErrorLimits.stack,
      userAgent: clientErrorLimits.userAgent,
    });
    expect(isReport(report)).toBeTruthy();
  });
});

describe(pathOf, () => {
  it("keeps the path alone, its ids replaced", () => {
    expect(pathOf("/invitations/aBcDeFgHiJkLmNoPqRsTuVwXyZ012345")).toBe(
      "/invitations/:id"
    );
    expect(pathOf("/reset-password?token=synthetic")).toBe("/reset-password");
    expect(pathOf("")).toBe("/");
  });
});
