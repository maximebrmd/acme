import { Effect, Layer } from "effect";

import { WorkspaceStanding } from "#billing/application/workspace-standing.ts";
import { ChannelOverview } from "#channels/application/channel-overview.ts";
import { InboxWaiting } from "#engagement/application/inbox-waiting.ts";
import { PostAttention } from "#publishing/application/post-attention.ts";
import { platforms } from "#shared/domain/platform.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { OverviewSources } from "#workspace/application/overview-sources.ts";
import type { AgendaEntry } from "#workspace/application/overview-sources.ts";

/**
 * What the overview reads of the other contexts, through their
 * application layers: publishing's posts, the channels context's channels
 * and their platforms, the inbox's waiting threads and billing's standing,
 * which has no form across workspaces: it is asked once per workspace of
 * the page (50 at most), rather than written a second time.
 */
export const ContextOverviewSourcesLive = Layer.effect(
  OverviewSources,
  Effect.gen(function* ContextOverviewSourcesLive() {
    const posts = yield* PostAttention;
    const channels = yield* ChannelOverview;
    const inbox = yield* InboxWaiting;
    const standing = yield* WorkspaceStanding;

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
      overPlan: (actor) =>
        standing.of(actor).pipe(Effect.map(({ mustReduce }) => mustReduce)),
      posts: (workspaceIds, now) => posts.countsIn(workspaceIds, now),
      unanswered: (workspaceIds) => inbox.unansweredIn(workspaceIds),
    });
  })
);
