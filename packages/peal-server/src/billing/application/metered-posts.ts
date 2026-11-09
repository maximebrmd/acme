import { Context, Effect, Layer } from "effect";
import type { DateTime } from "effect";

import { isMetered, meteringMonthOf } from "#billing/domain/metered-posts.ts";
import type { MeteredPostCount } from "#billing/domain/metered-posts.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { MeteredPostLedger } from "./ports/metered-post-ledger.ts";

/** A post that went out on one of a workspace's channels. */
export interface PublishedPost {
  readonly platform: Platform;
  readonly publishedAt: DateTime.Utc;
  /** Whether its text holds a link, as the platform finds links. */
  readonly withLink: boolean;
  readonly workspaceId: WorkspaceId;
}

/**
 * Counts the posts each workspace makes on the platforms that bill the
 * server per post (`meteredPlatforms`), and those with a link, by month
 * (UTC), for plans to limit later; on a server that does not bill too, so
 * its operator sees what each workspace spends. Publishing tells it of each
 * post that went out, in the transaction that settles it; others are not
 * counted.
 */
export class MeteredPosts extends Context.Service<
  MeteredPosts,
  {
    readonly published: (
      post: PublishedPost
    ) => Effect.Effect<void, DatabaseError>;
    /** The workspace's counts, oldest month first. */
    readonly ofWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly MeteredPostCount[], DatabaseError>;
  }
>()("peal-server/billing/application/MeteredPosts") {
  static readonly layer = Layer.effect(
    MeteredPosts,
    Effect.gen(function* MeteredPostsLive() {
      const ledger = yield* MeteredPostLedger;

      const published = Effect.fn("MeteredPosts.published")(function* published(
        post: PublishedPost
      ) {
        if (!isMetered(post.platform)) {
          return;
        }

        yield* ledger.add({
          month: meteringMonthOf(post.publishedAt),
          platform: post.platform,
          withLink: post.withLink,
          workspaceId: post.workspaceId,
        });
      });

      return MeteredPosts.of({
        ofWorkspace: ledger.ofWorkspace,
        published,
      });
    })
  );
}
