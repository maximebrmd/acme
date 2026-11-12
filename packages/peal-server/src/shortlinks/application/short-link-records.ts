import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ShortLinkRecord } from "#shared/application/personal-data.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { ShortLinkBase, shortUrlOf } from "./short-link-base.ts";
import { ShortLinkStore } from "./short-link-store.ts";

/**
 * A workspace's short links as a whole, for the workspace context when a
 * workspace's data is exported or erased: erasing deletes its links, their
 * clicks and its default, so the short addresses in its published posts
 * stop working. Erasing runs in the caller's transaction, if any.
 */
export class ShortLinkRecords extends Context.Service<
  ShortLinkRecords,
  {
    /** The workspace's links, oldest first, without their counts. */
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly ShortLinkRecord[], DatabaseError>;
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/shortlinks/application/ShortLinkRecords") {
  static readonly layer = Layer.effect(
    ShortLinkRecords,
    Effect.gen(function* ShortLinkRecordsLive() {
      const store = yield* ShortLinkStore;
      const { base } = yield* ShortLinkBase;

      return ShortLinkRecords.of({
        eraseWorkspace: (workspaceId) => store.eraseWorkspace(workspaceId),
        exportWorkspace: (workspaceId) =>
          store.exportWorkspace(workspaceId).pipe(
            Effect.map((links) =>
              links.map((link): ShortLinkRecord => ({
                channelId: link.channelId,
                code: link.code,
                createdAt: link.createdAt,
                destination: link.destination,
                part: link.part,
                postId: link.postId,
                shortUrl: Option.match(base, {
                  onNone: () => null,
                  onSome: (url) => shortUrlOf(url, link.code),
                }),
              }))
            )
          ),
      });
    })
  );
}
