import { DateTime, Effect, Layer, Option } from "effect";

import { AnalyticsQueries } from "#analytics/application/analytics-queries.ts";
import { DigestSources } from "#notifications/application/digest-sources.ts";
import { RecipientsUnavailable } from "#notifications/application/recipients-unavailable.ts";
import { digestListed } from "#notifications/domain/weekly-digest.ts";
import type {
  DigestWeek,
  DigestWorkspace,
} from "#notifications/domain/weekly-digest.ts";
import { PostAttention } from "#publishing/application/post-attention.ts";
import { can } from "#shared/domain/access.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { ActorsNow } from "#workspace/application/actors-now.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";

const utc = TimeZoneIdSchema.make("UTC");

// A day of the week as analytics takes it, in UTC.
const localDateOf = (instant: DateTime.Utc) => {
  const { day, month, year } = DateTime.toParts(instant);

  return { day, month, year };
};

/**
 * What a digest is written from, through the other contexts' application
 * layers, as the overview reads them: the account and its workspaces from
 * the workspace context, each workspace decided as a request of the
 * member's in their own session would be now (`ActorsNow`: a ban, a
 * removal, two-step verification required), its week from publishing
 * where they may read posts, and engagement from analytics where they may
 * read it. A few reads a workspace, each on an index.
 */
export const ContextDigestSources = Layer.effect(
  DigestSources,
  Effect.gen(function* ContextDigestSources() {
    const directory = yield* MemberDirectory;
    const actorsNow = yield* ActorsNow;
    const posts = yield* PostAttention;
    const analytics = yield* AnalyticsQueries;

    // The engagement of the week's posts in the workspaces whose analytics
    // the actors may read, in one read.
    const engagementIn = (actors: readonly Actor[], week: DigestWeek) =>
      actors.length === 0
        ? Effect.succeed(new Map<WorkspaceId, DigestWorkspace["engagement"]>())
        : analytics
            .acrossWorkspaces(actors, {
              _tag: "between",
              from: localDateOf(week.from),
              timeZone: utc,
              to: localDateOf(DateTime.subtract(week.to, { days: 1 })),
            })
            .pipe(
              Effect.catchTags({
                InvalidReportRange: Effect.die,
                MissingPermission: Effect.die,
              }),
              Effect.map(
                ({ workspaces }) =>
                  new Map(
                    [...workspaces.entries()].map(
                      ([workspaceId, figures]): readonly [
                        WorkspaceId,
                        DigestWorkspace["engagement"],
                      ] => [
                        workspaceId,
                        Option.some({
                          engagement: figures.totals.engagement,
                          impressions: figures.totals.impressions,
                        }),
                      ]
                    )
                  )
              )
            );

    const readerOf = Effect.fn("DigestSources.readerOf")(function* readerOf(
      userId: UserId,
      week: DigestWeek
    ) {
      const found = yield* directory
        .account(userId)
        .pipe(
          Effect.mapError(
            (failure) => new RecipientsUnavailable({ cause: failure })
          )
        );

      if (Option.isNone(found)) {
        return Option.none();
      }

      const account = found.value;

      const actors = yield* Effect.all(
        account.workspaces.map((workspace) =>
          actorsNow
            .ofMember(userId, workspace.id)
            .pipe(
              Effect.map((standing) =>
                standing._tag === "acting" && can(standing.actor, "post:read")
                  ? [{ actor: standing.actor, name: workspace.name }]
                  : []
              )
            )
        )
      ).pipe(Effect.map((each) => each.flat()));

      const engagement = yield* engagementIn(
        actors.flatMap(({ actor }) =>
          can(actor, "analytics:read") ? [actor] : []
        ),
        week
      );

      const workspaces = yield* Effect.all(
        actors.map(({ actor, name }) =>
          posts
            .week(actor.workspaceId, {
              from: week.from,
              listed: digestListed,
              to: week.to,
              until: week.until,
            })
            .pipe(
              Effect.map(({ counts, planned, wentOut }): DigestWorkspace => ({
                counts,
                engagement: engagement.get(actor.workspaceId) ?? Option.none(),
                name,
                planned: planned.map(({ excerpt, scheduledAt }) => ({
                  at: scheduledAt,
                  excerpt,
                })),
                wentOut: wentOut.map(({ excerpt, scheduledAt }) => ({
                  at: scheduledAt,
                  excerpt,
                })),
                workspaceId: actor.workspaceId,
              }))
            )
        )
      );

      return Option.some({
        email: account.email,
        locale: account.locale,
        workspaces,
      });
    });

    return DigestSources.of({ readerOf });
  })
);
