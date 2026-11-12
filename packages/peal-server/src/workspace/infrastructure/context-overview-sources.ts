import { Effect, Layer } from "effect";

import { AnalyticsQueries } from "#analytics/application/analytics-queries.ts";
import { WorkspaceStanding } from "#billing/application/workspace-standing.ts";
import { ChannelOverview } from "#channels/application/channel-overview.ts";
import { InboxWaiting } from "#engagement/application/inbox-waiting.ts";
import { PostAttention } from "#publishing/application/post-attention.ts";
import { platforms } from "#shared/domain/platform.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { OverviewSources } from "#workspace/application/overview-sources.ts";
import type {
  AgendaEntry,
  ReportAnswer,
} from "#workspace/application/overview-sources.ts";

/**
 * What the overview reads of the other contexts, through their
 * application layers: publishing's posts, the channels context's channels
 * and their platforms, the inbox's waiting threads, analytics' report across
 * workspaces, and billing's standing: a few reads each for a page,
 * whatever its number of workspaces.
 */
export const ContextOverviewSourcesLive = Layer.effect(
  OverviewSources,
  Effect.gen(function* ContextOverviewSourcesLive() {
    const posts = yield* PostAttention;
    const channels = yield* ChannelOverview;
    const inbox = yield* InboxWaiting;
    const standing = yield* WorkspaceStanding;
    const analytics = yield* AnalyticsQueries;

    return OverviewSources.of({
      agenda: Effect.fn("OverviewSources.agenda")(function* agenda(request) {
        const found = yield* posts.agenda(request);

        const platformOf = yield* channels.platformsOf([
          ...new Set(found.flatMap(({ channelIds }) => channelIds)),
        ]);

        return found.map(({ channelIds, ...post }): AgendaEntry => {
          const on = new Set<Platform>(
            channelIds.flatMap((channelId) => {
              const platform = platformOf.get(channelId);

              return platform === undefined ? [] : [platform];
            })
          );

          return {
            ...post,
            // Once each, in the order Peal lists platforms.
            platforms: platforms.filter((platform) => on.has(platform)),
          };
        });
      }),
      channels: (workspaceIds) => channels.statesIn(workspaceIds),
      overPlan: (workspaceIds) => standing.overPlanIn(workspaceIds),
      posts: (workspaceIds, now) => posts.countsIn(workspaceIds, now),
      // The overview passes the actors that may read analytics, over the
      // last 7, 30 or 90 days, which is always a range.
      report: (actors, { days, timeZone }) =>
        analytics
          .acrossWorkspaces(actors, { _tag: "last", days, timeZone })
          .pipe(
            Effect.catchTags({
              InvalidReportRange: Effect.die,
              MissingPermission: Effect.die,
            }),
            Effect.map(({ previous, range, workspaces }): ReportAnswer => ({
              previous: { from: previous.from, to: previous.to },
              range: { from: range.from, to: range.to },
              workspaces,
            }))
          ),
      unanswered: (workspaceIds) => inbox.unansweredIn(workspaceIds),
    });
  })
);
