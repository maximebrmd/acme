// The server counts the runs that fall behind (token refreshes, the
// analytics collection) and the uploads kept waiting: each of those metrics
// has an alert rule, or nobody hears that channels lapse or posts wait.
import { readFileSync } from "node:fs";
import path from "node:path";

import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

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
  "peal_ads_sync_unfinished_total",
  "peal_publishing_uploads_waiting",
  "peal_publishing_recycling_overdue",
  "peal_publishing_feeds_overdue",
];

const RuleSchema = Schema.Struct({
  annotations: Schema.Struct({ summary: Schema.String }),
  data: Schema.Array(
    Schema.Struct({
      model: Schema.Struct({ expr: Schema.optionalKey(Schema.String) }),
      refId: Schema.String,
    })
  ),
  execErrState: Schema.String,
  for: Schema.String,
  labels: Schema.Struct({ severity: Schema.String }),
  noDataState: Schema.String,
  uid: Schema.String,
});

type Rule = typeof RuleSchema.Type;

const provisioned = Schema.decodeUnknownSync(
  Schema.Struct({
    groups: Schema.Array(Schema.Struct({ rules: Schema.Array(RuleSchema) })),
  })
)(parse(rules));

const ruleOf = (uid: string): Rule | undefined =>
  provisioned.groups
    .flatMap((group) => group.rules)
    .find((rule) => rule.uid === uid);

describe("the production alert rules", () => {
  it.each(watched)("watch %s", (metric) => {
    expect(rules).toMatch(new RegExp(`expr: .*\\b${metric}\\b`, "u"));
  });

  // The server posts these gauges itself (the Ansible role peal_disks), every
  // 15 minutes: a server without the role, or without an array, never posts
  // one or posts zeros, and the rules stay quiet there.
  it.each([
    ["peal-raid-degraded", "peal_host_raid_degraded"],
    ["peal-disk-failing", "peal_host_disks_failing"],
  ])("alert from %s on the host's last %s", (uid, gauge) => {
    const rule = ruleOf(uid);

    expect(rule?.noDataState).toBe("OK");
    expect(rule?.execErrState).toBe("Error");
    expect(rule?.for).toBe("0s");
    expect(rule?.labels.severity).toBe("critical");
    expect(rule?.annotations.summary).toContain("runbooks/failed-disk.md");
    expect(rule?.data.find((step) => step.refId === "A")?.model.expr).toBe(
      `max(last_over_time(${gauge}[45m]))`
    );
  });

  it("give every rule its own uid", () => {
    const uids = [...rules.matchAll(/- uid: (?<uid>\S+)/gu)].map(
      (match) => match.groups?.["uid"] ?? ""
    );

    expect(new Set(uids).size).toBe(uids.length);
  });
});
