// The server counts the runs that fall behind (token refreshes, the
// analytics collection) and the uploads kept waiting: each of those metrics
// has an alert rule, or nobody hears that channels lapse or posts wait.
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const rules = readFileSync(
  path.join(
    import.meta.dirname,
    "..",
    "config/production/grafana/alerting/rules.yaml"
  ),
  "utf-8"
);

// The metrics, as Prometheus names them.
const watched = [
  "peal_channels_token_sweep_unfinished_total",
  "peal_analytics_collection_unfinished_total",
  "peal_analytics_accounts_unfinished_total",
  "peal_engagement_collection_unfinished_total",
  "peal_engagement_collection_thread_failures_total",
  "peal_publishing_uploads_waiting",
];

describe("the production alert rules", () => {
  it.each(watched)("watch %s", (metric) => {
    expect(rules).toMatch(new RegExp(`expr: .*\\b${metric}\\b`, "u"));
  });

  it("give every rule its own uid", () => {
    const uids = [...rules.matchAll(/- uid: (?<uid>\S+)/gu)].map(
      (match) => match.groups?.["uid"] ?? ""
    );

    expect(new Set(uids).size).toBe(uids.length);
  });
});
