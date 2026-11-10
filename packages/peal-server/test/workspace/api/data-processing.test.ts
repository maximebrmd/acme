// The registry of what Peal does with personal data states each retention
// period once; each must be the figure the rule that enforces it uses.
import { describe, expect, it } from "@effect/vitest";
import { Duration } from "effect";
import {
  activityRetentionDays,
  legalDisclosureYears,
  processingRegister,
  retentionPeriods,
} from "peal-contract";

import { activityRetention } from "#activity/domain/activity-retention.ts";
import { contractRetention } from "#billing/domain/contract-retention.ts";
import { trialMemory } from "#billing/domain/trial-memory.ts";
import { linkRetention } from "#channels/domain/connect-link.ts";
import { legalRetention } from "#legal/domain/legal-retention.ts";
import { downloadLifetime } from "#media/infrastructure/drizzle-media-records.ts";
import { idempotencyKeyLifetime } from "#publishing/domain/idempotency.ts";
import { auditRetention } from "#staff/domain/audit-retention.ts";
import { deliveryRetention } from "#webhooks/domain/delivery-policy.ts";
import { erasureLedgerRetention } from "#workspace/domain/erasure-ledger.ts";
import { creationKeyLifetime } from "#workspace/domain/idempotency.ts";

const categoryOf = (id: string) =>
  processingRegister.find((category) => category.id === id);

// How long a category is kept, in English.
const kept = (id: string) => categoryOf(id)?.retention.en ?? "";

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

  it("keeps a webhook delivery's log as long as its purge does", () => {
    expect(
      Duration.days(retentionPeriods.webhookDeliveries.days)
    ).toStrictEqual(deliveryRetention);
  });

  it("keeps a workspace's activity log as long as its purge does", () => {
    expect(Duration.days(retentionPeriods.activityLog.days)).toStrictEqual(
      activityRetention
    );
    // The API's description of the log says the same.
    expect(activityRetentionDays).toBe(retentionPeriods.activityLog.days);
    expect([
      kept("activity"),
      categoryOf("activity")?.retention.fr,
    ]).toStrictEqual([
      expect.stringContaining("90 days from each request"),
      expect.stringContaining("90 jours à compter de chaque requête"),
    ]);
    // Metadata only, as the log is.
    expect(categoryOf("activity")?.data.en).toContain(
      "never what the request or its answer carried"
    );
  });

  it("keeps an idempotency key as long as it answers its first post", () => {
    expect(
      Duration.hours(retentionPeriods.idempotencyKeys.hours)
    ).toStrictEqual(idempotencyKeyLifetime);
  });

  it("says of what each new surface keeps: webhooks, how posts were made, idempotency keys and contract requests", () => {
    const [webhooks, content, contracts] = ["webhooks", "content", "contracts"]
      .map(categoryOf)
      .map((category) => ({
        data: category?.data.en ?? "",
        kept: [category?.retention.en ?? "", category?.retention.fr ?? ""],
      }));

    expect(webhooks?.kept).toStrictEqual([
      expect.stringContaining("30 days"),
      expect.stringContaining("30 jours"),
    ]);
    expect(content?.data).toContain("how each post was created");
    expect(content?.kept).toStrictEqual([
      expect.stringContaining("24 hours"),
      expect.stringContaining("24 heures"),
    ]);
    expect(contracts?.data).toContain("request to cancel");
    expect(contracts?.kept).toStrictEqual([
      expect.stringContaining("5 years from its receipt"),
      expect.stringContaining("5 ans à compter de sa réception"),
    ]);
  });

  it("keeps a connect link as long as its purge does, and says so of connected accounts", () => {
    expect(Duration.days(retentionPeriods.connectLinks.days)).toStrictEqual(
      linkRetention
    );

    const channels = categoryOf("channels");

    expect(channels?.data.en).toContain("connect links");
    expect([channels?.retention.en, channels?.retention.fr]).toStrictEqual([
      expect.stringContaining(
        "30 days after it was used, revoked or expired, then deleted within a day"
      ),
      expect.stringContaining(
        "30 jours après avoir été utilisé, révoqué ou expiré, puis supprimé dans la journée"
      ),
    ]);
  });

  it("says what a partner account keeps, and for how long", () => {
    const partners = categoryOf("partners");

    // What the partner gives of its own customers is there by name.
    expect(partners?.data.en).toContain(
      "the identifier the partner gives each"
    );
    expect(partners?.data.en).toContain("never the keys themselves");
    // A key that makes a workspace is kept as the keys that make posts are.
    expect(
      Duration.hours(retentionPeriods.idempotencyKeys.hours)
    ).toStrictEqual(creationKeyLifetime);
    expect([partners?.retention.en, partners?.retention.fr]).toStrictEqual([
      expect.stringContaining("24 hours"),
      expect.stringContaining("24 heures"),
    ]);
  });

  it("says of the content that its fingerprints are kept, and of the activity log whose requests it holds", () => {
    expect(categoryOf("content")?.data.en).toContain(
      "a fingerprint of what each channel receives"
    );
    expect(categoryOf("activity")?.source.en).toContain(
      "partner keys and connect links"
    );
  });

  it("promises no deletion the software does not make", () => {
    // Only drafts and media files are deleted by members: a post that
    // left draft, and its figures, stay until the workspace goes.
    expect(kept("content")).toContain(
      "Posts that were scheduled, published or cancelled, their publication history and their figures: until the workspace is deleted"
    );
    expect(kept("content")).not.toContain("deletes the post");
    // The daily purges run once a day: a period is its rule's, then at
    // most a day more.
    expect(kept("content")).toContain("then deleted within a day");
    expect(kept("webhooks")).toContain(
      "days from each, then deleted within a day"
    );
    // Invoices are the payment provider's: this server deletes none.
    expect(kept("billing")).toContain("which deletes none of them");
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
