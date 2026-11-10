// The registry of what Peal does with personal data states each retention
// period once; each must be the figure the rule that enforces it uses.
import { describe, expect, it } from "@effect/vitest";
import { Duration } from "effect";
import {
  legalDisclosureYears,
  processingRegister,
  retentionPeriods,
} from "peal-contract";

import { contractRetention } from "#billing/domain/contract-retention.ts";
import { trialMemory } from "#billing/domain/trial-memory.ts";
import { legalRetention } from "#legal/domain/legal-retention.ts";
import { downloadLifetime } from "#media/infrastructure/drizzle-media-records.ts";
import { auditRetention } from "#staff/domain/audit-retention.ts";
import { erasureLedgerRetention } from "#workspace/domain/erasure-ledger.ts";

describe("the data processing registry", () => {
  it("keeps what French law has a host keep as long as the purge does", () => {
    expect({
      account: retentionPeriods.legalAccount,
      connections: retentionPeriods.legalConnections,
      disclosures: retentionPeriods.legalDisclosures,
      identity: retentionPeriods.legalIdentity,
    }).toStrictEqual(legalRetention);
    expect(retentionPeriods.legalDisclosures.years).toBe(legalDisclosureYears);
  });

  it("keeps the staff audit log as long as its retention rule does", () => {
    expect({
      bans: retentionPeriods.banRecords,
      general: retentionPeriods.auditLog,
    }).toStrictEqual(auditRetention);
    // A longer ban's record stays as long past its end as any event stays.
    expect(retentionPeriods.banPastEnd).toStrictEqual(auditRetention.general);
  });

  it("keeps orders, withdrawals and the memory of a trial as billing does", () => {
    expect(retentionPeriods.contracts).toStrictEqual(contractRetention);
    expect(retentionPeriods.trialMemory).toStrictEqual(trialMemory);
  });

  it("keeps the erasure ledger as long as its rule says, longer than the backups", () => {
    expect(retentionPeriods.erasureLedger).toStrictEqual(
      erasureLedgerRetention
    );
    expect(retentionPeriods.erasureLedger.days).toBeGreaterThan(
      retentionPeriods.backups.weeks * 7
    );
  });

  it("gives an export's media links the life the media context signs them for", () => {
    expect(Duration.days(retentionPeriods.exportLinks.days)).toStrictEqual(
      downloadLifetime
    );
  });

  it("says something of every category, in both languages", () => {
    const ids = processingRegister.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const category of processingRegister) {
      for (const text of [
        category.name,
        category.data,
        category.purposes,
        category.legalBasis,
        category.retention,
        category.source,
      ]) {
        expect(text.en.trim()).not.toBe("");
        expect(text.fr.trim()).not.toBe("");
      }
    }
  });
});
