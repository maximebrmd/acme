import { and, eq, lt, notInArray, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";
import type { SqlError } from "effect/sql";

import { ReadModel } from "#ads/application/ports/read-model.ts";
import type {
  AdRow,
  CampaignRow,
  DayRange,
  DayTotals,
  PaidTotals,
} from "#ads/application/ports/read-model.ts";
import {
  AdObjectStatusSchema,
  CampaignObjectiveSchema,
} from "#ads/domain/ad-object.ts";
import { AdAccountIdSchema, NetworkObjectIdSchema } from "#ads/domain/ids.ts";
import { PostIdSchema, PostTargetIdSchema } from "#shared/domain/ids.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { date, dateOrNull, failed } from "./rows.ts";
import {
  activeAdMonths,
  adSets,
  ads,
  campaigns,
  insightDays,
} from "./schema.ts";

/** A calendar day as Postgres writes a date: `2026-11-10`. */
export const dayText = ({ day, month, year }: LocalDate) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

// Rows are written many at a time, this many a statement at most.
const batchSize = 500;

const batches = <A>(rows: readonly A[]): readonly (readonly A[])[] =>
  Array.from({ length: Math.ceil(rows.length / batchSize) }, (_, index) =>
    rows.slice(index * batchSize, (index + 1) * batchSize)
  );

// What an object's row takes of what was just read, when it is there.
const reread = (columns: readonly string[]): Record<string, SQL> =>
  Object.fromEntries(
    columns.map((column) => [column, sql.raw(`excluded.${column}`)] as const)
  );

// Sums come back as float8 or int8 text; a missing sum is null.
const amount = Schema.Union([Schema.Number, Schema.NumberFromString]);

const totalsFields = {
  clicks: amount,
  impressions: amount,
  reach: amount,
  results: Schema.NullOr(amount),
  spend: amount,
};

const totalsOf = (row: {
  readonly clicks: number;
  readonly impressions: number;
  readonly reach: number;
  readonly results: number | null;
  readonly spend: number;
}): PaidTotals => ({
  clicks: row.clicks,
  impressions: row.impressions,
  reach: row.reach,
  results: Option.fromNullOr(row.results),
  spend: row.spend,
});

const storedInstant = Schema.NullOr(Schema.DateTimeUtcFromDate);

const CampaignRowSchema = Schema.Struct({
  ...totalsFields,
  accountId: AdAccountIdSchema,
  dailyBudget: Schema.NullOr(amount),
  endsAt: storedInstant,
  externalId: NetworkObjectIdSchema,
  name: Schema.String,
  objective: CampaignObjectiveSchema,
  rawStatus: Schema.String,
  startsAt: storedInstant,
  status: AdObjectStatusSchema,
  syncedAt: Schema.DateTimeUtcFromDate,
  totalBudget: Schema.NullOr(amount),
});

const AdRowSchema = Schema.Struct({
  ...totalsFields,
  accountId: AdAccountIdSchema,
  adSetExternalId: NetworkObjectIdSchema,
  campaignExternalId: NetworkObjectIdSchema,
  externalId: NetworkObjectIdSchema,
  name: Schema.String,
  postId: Schema.NullOr(PostIdSchema),
  rawStatus: Schema.String,
  status: AdObjectStatusSchema,
  targetId: Schema.NullOr(PostTargetIdSchema),
});

const DayRowSchema = Schema.Struct({
  ...totalsFields,
  day: Schema.String,
});

const PostRowSchema = Schema.Struct({
  ...totalsFields,
  accountId: AdAccountIdSchema,
  ads: amount,
  targetId: Schema.NullOr(PostTargetIdSchema),
});

const decodeCampaigns = Schema.decodeUnknownEffect(
  Schema.Array(CampaignRowSchema)
);

const decodeAds = Schema.decodeUnknownEffect(Schema.Array(AdRowSchema));
const decodeDays = Schema.decodeUnknownEffect(Schema.Array(DayRowSchema));
const decodePosts = Schema.decodeUnknownEffect(Schema.Array(PostRowSchema));

const decodeSpent = Schema.decodeUnknownEffect(
  Schema.Array(Schema.Struct({ spend: amount }))
);

const dayPattern = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u;

const localDate = (written: string): LocalDate => {
  const groups = dayPattern.exec(written)?.groups;

  return {
    day: Number(groups?.["day"] ?? "1"),
    month: Number(groups?.["month"] ?? "1"),
    year: Number(groups?.["year"] ?? "1970"),
  };
};

// Every row but those just listed: all of them when nothing was listed.
const others = (
  column: AnyPgColumn,
  listed: readonly { readonly externalId: string }[]
) =>
  listed.length === 0
    ? undefined
    : notInArray(
        column,
        listed.map(({ externalId }) => externalId)
      );

// A statement's rows, decoded: a row the schema could not have written
// fails loudly instead of being trusted.
const query = <A>(
  statement: Effect.Effect<readonly unknown[], SqlError.SqlError>,
  decode: (rows: readonly unknown[]) => Effect.Effect<A, unknown>
) =>
  statement.pipe(
    Effect.mapError(failed),
    Effect.flatMap((rows) => decode(rows).pipe(Effect.orDie))
  );

/** The read model in the ads schema. */
export const DrizzleReadModel = Layer.effect(
  ReadModel,
  Effect.gen(function* DrizzleReadModel() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    const between = (range: DayRange) =>
      client`i.day BETWEEN ${dayText(range.from)}::date AND ${dayText(range.to)}::date`;

    const sums = client`
      coalesce(sum(i.spend), 0)::float8 AS spend,
      coalesce(sum(i.impressions), 0)::float8 AS impressions,
      coalesce(sum(i.reach), 0)::float8 AS reach,
      coalesce(sum(i.clicks), 0)::float8 AS clicks,
      sum(i.results)::float8 AS results`;

    return ReadModel.of({
      ads: (workspaceId, accountId, campaignExternalId, range) =>
        query(
          client`
            SELECT a.account_id AS "accountId", a.external_id AS "externalId",
              a.ad_set_external_id AS "adSetExternalId",
              a.campaign_external_id AS "campaignExternalId", a.name,
              a.status, a.raw_status AS "rawStatus", a.post_id AS "postId",
              a.target_id AS "targetId", ${sums}
            FROM ads.ads a
            LEFT JOIN ads.insight_days i
              ON i.account_id = a.account_id
              AND i.ad_external_id = a.external_id AND ${between(range)}
            WHERE a.workspace_id = ${workspaceId} AND a.account_id = ${accountId}
              ${Option.match(campaignExternalId, {
                onNone: () => client``,
                onSome: (id) => client`AND a.campaign_external_id = ${id}`,
              })}
            GROUP BY a.account_id, a.external_id
            ORDER BY a.external_id DESC
            LIMIT 1000`,
          decodeAds
        ).pipe(
          Effect.map((rows) =>
            rows.map((row): AdRow => ({
              accountId: row.accountId,
              adSetExternalId: row.adSetExternalId,
              campaignExternalId: row.campaignExternalId,
              externalId: row.externalId,
              name: row.name,
              postId: Option.fromNullOr(row.postId),
              rawStatus: row.rawStatus,
              status: row.status,
              targetId: Option.fromNullOr(row.targetId),
              totals: totalsOf(row),
            }))
          )
        ),
      campaigns: (workspaceId, accountId, range) =>
        query(
          client`
            SELECT c.account_id AS "accountId", c.external_id AS "externalId",
              c.name, c.status, c.raw_status AS "rawStatus", c.objective,
              c.daily_budget::float8 AS "dailyBudget",
              c.total_budget::float8 AS "totalBudget",
              c.starts_at AS "startsAt", c.ends_at AS "endsAt",
              c.synced_at AS "syncedAt", ${sums}
            FROM ads.campaigns c
            LEFT JOIN ads.ads a
              ON a.account_id = c.account_id
              AND a.campaign_external_id = c.external_id
            LEFT JOIN ads.insight_days i
              ON i.account_id = a.account_id
              AND i.ad_external_id = a.external_id AND ${between(range)}
            WHERE c.workspace_id = ${workspaceId} AND c.account_id = ${accountId}
            GROUP BY c.account_id, c.external_id
            ORDER BY c.starts_at DESC NULLS LAST, c.external_id DESC
            LIMIT 1000`,
          decodeCampaigns
        ).pipe(
          Effect.map((rows) =>
            rows.map((row): CampaignRow => ({
              accountId: row.accountId,
              dailyBudget: Option.fromNullOr(row.dailyBudget),
              endsAt: Option.fromNullOr(row.endsAt),
              externalId: row.externalId,
              name: row.name,
              objective: row.objective,
              rawStatus: row.rawStatus,
              startsAt: Option.fromNullOr(row.startsAt),
              status: row.status,
              syncedAt: row.syncedAt,
              totalBudget: Option.fromNullOr(row.totalBudget),
              totals: totalsOf(row),
            }))
          )
        ),
      days: (workspaceId, accountId, range) =>
        query(
          client`
            SELECT to_char(i.day, 'YYYY-MM-DD') AS day, ${sums}
            FROM ads.insight_days i
            WHERE i.workspace_id = ${workspaceId} AND i.account_id = ${accountId}
              AND ${between(range)}
            GROUP BY i.day
            ORDER BY i.day`,
          decodeDays
        ).pipe(
          Effect.map((rows) =>
            rows.map((row): DayTotals => ({
              ...totalsOf(row),
              day: localDate(row.day),
            }))
          )
        ),
      ofPost: (workspaceId, postId) =>
        query(
          client`
            SELECT a.account_id AS "accountId", a.target_id AS "targetId",
              count(DISTINCT a.external_id)::float8 AS ads, ${sums}
            FROM ads.ads a
            LEFT JOIN ads.insight_days i
              ON i.account_id = a.account_id
              AND i.ad_external_id = a.external_id
            WHERE a.workspace_id = ${workspaceId} AND a.post_id = ${postId}
            GROUP BY a.account_id, a.target_id
            ORDER BY a.account_id`,
          decodePosts
        ).pipe(
          Effect.map((rows) =>
            rows.map((row) => ({
              accountId: row.accountId,
              ads: row.ads,
              targetId: Option.fromNullOr(row.targetId),
              totals: totalsOf(row),
            }))
          )
        ),
      // The managed ads counted go with the days, by their month.
      purgeDaysBefore: (day) =>
        Effect.all([
          db
            .delete(insightDays)
            .where(lt(insightDays.day, dayText(day)))
            .returning({ day: insightDays.day }),
          db
            .delete(activeAdMonths)
            .where(
              lt(
                activeAdMonths.month,
                sql`${dayText({ day: 1, month: day.month, year: day.year })}::date`
              )
            )
            .returning({ month: activeAdMonths.month }),
        ]).pipe(
          Effect.mapError(failed),
          Effect.map(([days, months]) => days.length + months.length)
        ),
      save: ({ account, complete, matched, now, snapshot }) => {
        const common = {
          accountId: account.id,
          syncedAt: date(now),
          workspaceId: account.workspaceId,
        };

        const state = ["name", "raw_status", "status", "synced_at"] as const;

        const budget = [
          "daily_budget",
          "total_budget",
          "starts_at",
          "ends_at",
        ] as const;

        const saving = Effect.gen(function* saving() {
          for (const rows of batches(snapshot.campaigns)) {
            yield* db
              .insert(campaigns)
              .values(
                rows.map((campaign) => ({
                  ...common,
                  dailyBudget: Option.getOrNull(campaign.dailyBudget),
                  endsAt: dateOrNull(campaign.endsAt),
                  externalId: campaign.externalId,
                  name: campaign.name,
                  objective: campaign.objective,
                  rawStatus: campaign.rawStatus,
                  startsAt: dateOrNull(campaign.startsAt),
                  status: campaign.status,
                  totalBudget: Option.getOrNull(campaign.totalBudget),
                }))
              )
              .onConflictDoUpdate({
                set: reread([...state, ...budget, "objective"]),
                target: [campaigns.accountId, campaigns.externalId],
              });
          }

          for (const rows of batches(snapshot.adSets)) {
            yield* db
              .insert(adSets)
              .values(
                rows.map((adSet) => ({
                  ...common,
                  campaignExternalId: adSet.campaignExternalId,
                  dailyBudget: Option.getOrNull(adSet.dailyBudget),
                  endsAt: dateOrNull(adSet.endsAt),
                  externalId: adSet.externalId,
                  name: adSet.name,
                  rawStatus: adSet.rawStatus,
                  startsAt: dateOrNull(adSet.startsAt),
                  status: adSet.status,
                  totalBudget: Option.getOrNull(adSet.totalBudget),
                }))
              )
              .onConflictDoUpdate({
                set: reread([...state, ...budget, "campaign_external_id"]),
                target: [adSets.accountId, adSets.externalId],
              });
          }

          for (const rows of batches(snapshot.ads)) {
            yield* db
              .insert(ads)
              .values(
                rows.map((ad) => {
                  const own = Option.orElse(
                    Option.flatMapNullishOr(ad.promotedPagePostId, (id) =>
                      matched.get(id)
                    ),
                    () =>
                      Option.flatMapNullishOr(
                        ad.promotedInstagramMediaId,
                        (id) => matched.get(id)
                      )
                  );

                  return {
                    ...common,
                    adSetExternalId: ad.adSetExternalId,
                    campaignExternalId: ad.campaignExternalId,
                    externalId: ad.externalId,
                    name: ad.name,
                    postId: Option.getOrNull(
                      own.pipe(Option.map(({ postId }) => postId))
                    ),
                    promotedInstagramMediaId: Option.getOrNull(
                      ad.promotedInstagramMediaId
                    ),
                    promotedPagePostId: Option.getOrNull(ad.promotedPagePostId),
                    rawStatus: ad.rawStatus,
                    status: ad.status,
                    targetId: Option.getOrNull(
                      own.pipe(Option.map(({ targetId }) => targetId))
                    ),
                  };
                })
              )
              .onConflictDoUpdate({
                set: reread([
                  ...state,
                  "ad_set_external_id",
                  "campaign_external_id",
                  "post_id",
                  "promoted_instagram_media_id",
                  "promoted_page_post_id",
                  "target_id",
                ]),
                target: [ads.accountId, ads.externalId],
              });
          }

          for (const rows of batches(snapshot.insights)) {
            yield* db
              .insert(insightDays)
              .values(
                rows.map((day) => ({
                  accountId: account.id,
                  adExternalId: day.adExternalId,
                  clicks: day.clicks,
                  day: dayText(day.day),
                  impressions: day.impressions,
                  reach: day.reach,
                  results: Option.getOrNull(day.results),
                  spend: day.spend,
                  workspaceId: account.workspaceId,
                }))
              )
              .onConflictDoUpdate({
                set: reread([
                  "clicks",
                  "impressions",
                  "reach",
                  "results",
                  "spend",
                ]),
                target: [
                  insightDays.accountId,
                  insightDays.adExternalId,
                  insightDays.day,
                ],
              });
          }

          if (complete) {
            // What the network no longer lists is archived or deleted
            // there: kept for its numbers, and shown as archived.
            const unlisted = { rawStatus: "UNLISTED", status: "archived" };

            yield* db
              .update(campaigns)
              .set(unlisted)
              .where(
                and(
                  eq(campaigns.accountId, account.id),
                  others(campaigns.externalId, snapshot.campaigns)
                )
              );
            yield* db
              .update(adSets)
              .set(unlisted)
              .where(
                and(
                  eq(adSets.accountId, account.id),
                  others(adSets.externalId, snapshot.adSets)
                )
              );
            yield* db
              .update(ads)
              .set(unlisted)
              .where(
                and(
                  eq(ads.accountId, account.id),
                  others(ads.externalId, snapshot.ads)
                )
              );
          }
        });

        return client
          .withTransaction(saving)
          .pipe(Effect.mapError(failed), Effect.withSpan("ReadModel.save"));
      },
      spentBy: (accountId, adExternalId) =>
        query(
          client`
            SELECT coalesce(sum(spend), 0)::float8 AS spend
            FROM ads.insight_days
            WHERE account_id = ${accountId} AND ad_external_id = ${adExternalId}`,
          decodeSpent
        ).pipe(Effect.map(([row]) => row?.spend ?? 0)),
    });
  })
);

/** The day an instant falls on in UTC, for the retention's cutoff. */
export const utcDayOf = (at: DateTime.Utc): LocalDate => {
  const { day, month, year } = DateTime.toPartsUtc(at);

  return { day, month, year };
};
