import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { Boost } from "#ads/domain/boost.ts";
import { AdAccountIdSchema } from "#ads/domain/ids.ts";
import type { AdAccountId } from "#ads/domain/ids.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import {
  addDays,
  LocalDateSchema,
  localDateOf,
} from "#shared/domain/wall-clock.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

import { AdAccountNotFound } from "./ad-account-not-found.ts";
import { InvalidAdRange } from "./invalid-ad-range.ts";
import { AccountStore } from "./ports/account-store.ts";
import type { AuthorizedAccount } from "./ports/account-store.ts";
import { BoostStore } from "./ports/boost-store.ts";
import type { AuditEntry } from "./ports/boost-store.ts";
import { OrganicCounts } from "./ports/organic-counts.ts";
import type { OrganicOnChannel } from "./ports/organic-counts.ts";
import { ReadModel } from "./ports/read-model.ts";
import type {
  AdRow,
  CampaignRow,
  DayRange,
  DayTotals,
  PaidTotals,
} from "./ports/read-model.ts";

/** The longest range a report covers: 13 months, what is kept. */
export const maxRangeDays = 396;

/** The range a report covers when none is asked: the last 30 days. */
export const defaultRangeDays = 30;

/** The days asked of a report, on the account's calendar. */
export interface AskedRange {
  readonly from: Option.Option<LocalDate>;
  readonly to: Option.Option<LocalDate>;
}

/** A report with the account and the days it covers. */
export interface Report<A> {
  readonly account: AuthorizedAccount;
  readonly range: DayRange;
  readonly rows: readonly A[];
}

/**
 * A published post's numbers side by side: what people did with it on each
 * channel without any ad, and what the ads that promote it did, by ad
 * account, as amounts of different currencies never add. Paid numbers are
 * part of what a platform counts on the post: the two are shown beside
 * each other, never summed.
 */
export interface PostPerformance {
  readonly boosts: readonly Boost[];
  readonly organic: readonly OrganicOnChannel[];
  readonly paid: readonly {
    readonly account: AuthorizedAccount;
    readonly ads: number;
    readonly totals: PaidTotals;
  }[];
}

const decodeAccountId = Schema.decodeUnknownOption(AdAccountIdSchema);
const decodePostId = Schema.decodeUnknownOption(PostIdSchema);
const isLocalDate = Schema.is(LocalDateSchema);

const dayNumber = (date: LocalDate) =>
  Math.round(DateTime.toEpochMillis(DateTime.makeUnsafe(date)) / 86_400_000);

/** The most lines of the audit trail a page answers. */
export const auditPageSize = 100;

/**
 * What the networks say of a workspace's ads, as last synced, for someone
 * who may read ads (ads:read): campaigns and ads with what they did over a
 * range of days of the account's calendar, each day's totals, a post's
 * organic and paid numbers side by side, and the audit trail, which
 * answers to owners alone (ads:authorize).
 */
export class AdReports extends Context.Service<
  AdReports,
  {
    readonly campaigns: (
      actor: Actor,
      accountId: string,
      range: AskedRange
    ) => Effect.Effect<
      Report<CampaignRow>,
      AdAccountNotFound | DatabaseError | InvalidAdRange | MissingPermission
    >;
    readonly ads: (
      actor: Actor,
      accountId: string,
      campaignId: Option.Option<string>,
      range: AskedRange
    ) => Effect.Effect<
      Report<AdRow>,
      AdAccountNotFound | DatabaseError | InvalidAdRange | MissingPermission
    >;
    readonly days: (
      actor: Actor,
      accountId: string,
      range: AskedRange
    ) => Effect.Effect<
      Report<DayTotals>,
      AdAccountNotFound | DatabaseError | InvalidAdRange | MissingPermission
    >;
    readonly ofPost: (
      actor: Actor,
      postId: string
    ) => Effect.Effect<PostPerformance, DatabaseError | MissingPermission>;
    readonly auditTrail: (
      actor: Actor,
      before: Option.Option<string>
    ) => Effect.Effect<
      readonly AuditEntry[],
      DatabaseError | MissingPermission
    >;
  }
>()("peal-server/ads/application/AdReports") {
  static readonly layer = Layer.effect(
    AdReports,
    Effect.gen(function* AdReportsLive() {
      const accounts = yield* AccountStore;
      const readModel = yield* ReadModel;
      const boosts = yield* BoostStore;
      const organic = yield* OrganicCounts;

      // The account and the days to report on: those asked, or the last
      // 30 of the account's calendar.
      const scope = Effect.fn("AdReports.scope")(function* scope(
        actor: Actor,
        accountId: string,
        asked: AskedRange
      ) {
        yield* Effect.fromResult(authorize(actor, "ads:read"));

        const id = decodeAccountId(accountId);

        const account = Option.isSome(id)
          ? yield* accounts.findIn(actor.workspaceId, id.value)
          : Option.none<AuthorizedAccount>();

        if (Option.isNone(account)) {
          return yield* new AdAccountNotFound();
        }

        const today = localDateOf(
          yield* DateTime.now,
          account.value.account.timeZone
        );

        const to = Option.getOrElse(asked.to, () => today);

        const from = Option.getOrElse(asked.from, () =>
          addDays(to, 1 - defaultRangeDays)
        );

        const days = dayNumber(to) - dayNumber(from) + 1;

        if (days < 1 || days > maxRangeDays || !isLocalDate(from)) {
          return yield* new InvalidAdRange({ days });
        }

        return { account: account.value, range: { from, to } };
      });

      const report =
        <A>(
          rows: (
            account: AuthorizedAccount,
            accountId: AdAccountId,
            range: DayRange
          ) => Effect.Effect<readonly A[], DatabaseError>
        ) =>
        (actor: Actor, accountId: string, asked: AskedRange) =>
          scope(actor, accountId, asked).pipe(
            Effect.flatMap(({ account, range }) =>
              rows(account, account.account.id, range).pipe(
                Effect.map((found): Report<A> => ({
                  account,
                  range,
                  rows: found,
                }))
              )
            )
          );

      return AdReports.of({
        ads: (actor, accountId, campaignId, asked) =>
          report((account, id, range) =>
            readModel.ads(account.account.workspaceId, id, campaignId, range)
          )(actor, accountId, asked),
        auditTrail: Effect.fn("AdReports.auditTrail")(
          function* auditTrail(actor, before) {
            yield* Effect.fromResult(authorize(actor, "ads:authorize"));

            return yield* boosts.auditTrail(actor.workspaceId, {
              before,
              limit: auditPageSize,
            });
          }
        ),
        campaigns: report((account, id, range) =>
          readModel.campaigns(account.account.workspaceId, id, range)
        ),
        days: report((account, id, range) =>
          readModel.days(account.account.workspaceId, id, range)
        ),
        ofPost: Effect.fn("AdReports.ofPost")(function* ofPost(actor, postId) {
          yield* Effect.fromResult(authorize(actor, "ads:read"));

          const id = decodePostId(postId);

          if (Option.isNone(id)) {
            return { boosts: [], organic: [], paid: [] };
          }

          const held = yield* accounts.list(actor.workspaceId);

          const byAccount = yield* readModel.ofPost(
            actor.workspaceId,
            id.value
          );

          const performance: PostPerformance = {
            boosts: yield* boosts.list(actor.workspaceId, {
              before: Option.none(),
              limit: 50,
              postId: id,
            }),
            // Someone who reads ads and not analytics sees the paid side.
            organic: yield* organic
              .ofPost(actor, id.value)
              .pipe(
                Effect.catchTag("MissingPermission", () => Effect.succeed([]))
              ),
            paid: byAccount.flatMap(({ accountId, ads, totals }) => {
              const account = held.find(
                (candidate) => candidate.account.id === accountId
              );

              return account === undefined ? [] : [{ account, ads, totals }];
            }),
          };

          return performance;
        }),
      });
    })
  );
}
