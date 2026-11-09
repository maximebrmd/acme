import { describe, expect, it } from "@effect/vitest";
import type { ClientErrorReport } from "acme-contract";

import { makeReporter, maxReportsPerPage } from "#errors/reporter.ts";

const report = (message: string): ClientErrorReport => ({
  digest: null,
  kind: "uncaught",
  message,
  path: "/app",
  release: "test",
  route: null,
  stack: null,
  userAgent: null,
});

describe(makeReporter, () => {
  it("sends the same error once", () => {
    const sent: ClientErrorReport[] = [];

    const reportError = makeReporter((next) => {
      sent.push(next);
    });

    reportError(report("Synthetic loop"));
    reportError(report("Synthetic loop"));
    reportError({ ...report("Synthetic loop"), kind: "boundary" });

    expect(sent.map(({ kind }) => kind)).toStrictEqual([
      "uncaught",
      "boundary",
    ]);
  });

  it("sends a page's first errors only", () => {
    const sent: ClientErrorReport[] = [];

    const reportError = makeReporter((next) => {
      sent.push(next);
    });

    for (let index = 0; index < maxReportsPerPage * 2; index += 1) {
      reportError(report(`Synthetic error ${index}`));
    }

    expect(sent).toHaveLength(maxReportsPerPage);
  });
});
