import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "@effect/vitest";
import { Duration } from "effect";

import { httpShutdownTimeout, workflowShutdownTimeout } from "#app/shutdown.ts";

// The server's two waits at shutdown (HTTP requests in flight, and the
// cluster's calls to the platforms) end before Docker kills the container:
// the server's stop_grace_period in compose.production.yaml, less a margin
// for the rest of the shutdown.

const compose = readFileSync(
  path.join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "peal-docker",
    "compose.production.yaml"
  ),
  "utf-8"
);

const serverService = /\n {2}server:\n(?<body>(?: {4}.*\n|\s*\n)+)/u.exec(
  compose
)?.groups?.["body"];

const gracePeriod = Duration.seconds(
  Number(
    /stop_grace_period: (?<seconds>\d+)s/u.exec(serverService ?? "")?.groups?.[
      "seconds"
    ]
  )
);

const margin = Duration.seconds(10);

describe("the server's shutdown", () => {
  it("reads the server's stop grace period", () => {
    expect(Duration.toSeconds(gracePeriod)).toBe(75);
  });

  it.each([
    ["HTTP requests", httpShutdownTimeout],
    ["workflows' platform calls", workflowShutdownTimeout],
  ])("waits for %s within the grace period", (_name, timeout) => {
    expect(
      Duration.toSeconds(Duration.sum(timeout, margin))
    ).toBeLessThanOrEqual(Duration.toSeconds(gracePeriod));
  });
});
