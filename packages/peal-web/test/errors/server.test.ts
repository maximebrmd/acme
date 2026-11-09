import { describe, expect, it } from "@effect/vitest";

import { serverReportOf } from "#errors/server.ts";

describe(serverReportOf, () => {
  it("reports a render error with its route, without the query", () => {
    const error = Object.assign(new Error("Synthetic render failure"), {
      digest: "1234567",
    });

    const report = serverReportOf(
      error,
      {
        headers: {
          cookie: "peal.session_token=synthetic",
          "user-agent": "Mozilla/5.0 (Synthetic)",
        },
        method: "GET",
        path: "/fr/app/5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60/calendar?date=2026-11-09",
      },
      {
        renderSource: "react-server-components",
        revalidateReason: undefined,
        routePath: "/[locale]/app/[workspaceId]/calendar",
        routeType: "render",
        routerKind: "App Router",
      },
      "2026.11.0"
    );

    expect(report).toStrictEqual({
      digest: "1234567",
      kind: "server",
      message: "Synthetic render failure",
      path: "/fr/app/:id/calendar",
      release: "2026.11.0",
      route: "/[locale]/app/[workspaceId]/calendar",
      stack: report.stack,
      userAgent: "Mozilla/5.0 (Synthetic)",
    });
    expect(JSON.stringify(report)).not.toContain("session_token");
  });

  it("leaves out a user agent sent twice", () => {
    const report = serverReportOf(
      new Error("Synthetic"),
      {
        headers: { "user-agent": ["one", "two"] },
        method: "GET",
        path: "/",
      },
      {
        renderSource: "server-rendering",
        revalidateReason: undefined,
        routePath: "/[locale]",
        routeType: "render",
        routerKind: "App Router",
      },
      "test"
    );

    expect(report.userAgent).toBeNull();
  });
});
