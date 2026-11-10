// The production stack keeps logs, traces, metrics and backups as long as
// the registry of what Peal does with personal data says
// (packages/peal-contract/src/data-processing.ts), which the privacy
// policy and each user's export are written from. Change a period here
// and there together.
import { readFileSync } from "node:fs";
import path from "node:path";

import { retentionPeriods } from "peal-contract/data-processing";
import { describe, expect, it } from "vitest";

const read = (...segments: readonly string[]): string =>
  readFileSync(path.join(import.meta.dirname, "..", ...segments), "utf-8");

// Every value a setting takes in a file, as written.
const valuesOf = (text: string, setting: RegExp): string[] =>
  [...text.matchAll(setting)].map((match) => match.groups?.["value"] ?? "");

const hours = (days: number) => `${days * 24}h`;

describe("the production stack's retention", () => {
  it("keeps server logs as long as the registry says", () => {
    expect(
      valuesOf(
        read("config/production/loki.yaml"),
        /retention_period: (?<value>\S+)/gu
      )
    ).toStrictEqual([hours(retentionPeriods.serverLogs.days)]);
  });

  it("keeps traces as long as the registry says, in both of Tempo's settings", () => {
    expect(
      valuesOf(
        read("config/production/tempo.yaml"),
        /block_retention: (?<value>\S+)/gu
      )
    ).toStrictEqual([
      hours(retentionPeriods.traces.days),
      hours(retentionPeriods.traces.days),
    ]);
  });

  it("keeps metrics as long as the registry says", () => {
    expect(
      valuesOf(
        read("compose.production.yaml"),
        /--storage\.tsdb\.retention\.time=(?<value>\S+)/gu
      )
    ).toStrictEqual([`${retentionPeriods.metrics.days}d`]);
  });

  // peal-infra takes a full backup each week. With four kept, the oldest
  // goes when the fifth is made: deleted data stays 5 weeks at most.
  it("keeps deleted data in backups no longer than the registry says", () => {
    expect(
      valuesOf(
        read("compose.production.yaml"),
        /PGBACKREST_REPO1_RETENTION_FULL: "(?<value>\d+)"/gu
      ).map((kept) => Number(kept) + 1)
    ).toStrictEqual([retentionPeriods.backups.weeks]);
  });
});
