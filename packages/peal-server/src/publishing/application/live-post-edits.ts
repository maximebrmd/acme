import { Context, Effect, Layer, Option } from "effect";

import type { LivePostChangeId } from "#publishing/domain/live-post-change-id.ts";
import type { TargetOptions } from "#publishing/domain/target-options.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { LivePostChangeStore } from "./live-post-change-store.ts";
import { PostRepository } from "./post-repository.ts";

/** What an edit sends: its new text, and the target's options there. */
export interface PendingEdit {
  readonly options: Option.Option<TargetOptions>;
  readonly text: string;
}

/**
 * What the gate's side of an edit reads, as the call that reaches it
 * holds ids only: the text of the pending edit, and the options of its
 * target, which some platforms must be sent again (Mastodon's content
 * warning). None once the change ended or went with its workspace.
 */
export class LivePostEdits extends Context.Service<
  LivePostEdits,
  {
    readonly of: (
      changeId: LivePostChangeId
    ) => Effect.Effect<Option.Option<PendingEdit>, DatabaseError>;
  }
>()("peal-server/publishing/application/LivePostEdits") {
  /** From the changes' and the posts' stores. */
  static readonly layer = Layer.effect(
    LivePostEdits,
    Effect.gen(function* LivePostEditsLive() {
      const changes = yield* LivePostChangeStore;
      const posts = yield* PostRepository;

      return LivePostEdits.of({
        of: Effect.fn("LivePostEdits.of")(function* of(
          changeId: LivePostChangeId
        ) {
          const change = yield* changes.find(changeId);

          if (
            Option.isNone(change) ||
            change.value.status !== "pending" ||
            change.value.kind !== "edit" ||
            Option.isNone(change.value.text)
          ) {
            return Option.none<PendingEdit>();
          }

          const text = change.value.text.value;
          const target = yield* posts.findTarget(change.value.targetId);

          return target.pipe(
            Option.map(({ options }): PendingEdit => ({ options, text }))
          );
        }),
      });
    })
  );
}
