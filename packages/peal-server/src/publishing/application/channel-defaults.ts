import { Context, DateTime, Effect, Layer, Option } from "effect";

import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { checkSavedOptions } from "#publishing/domain/content-rules.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import type { TargetOptions } from "#publishing/domain/target-options.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ChannelDefaultsStore } from "./channel-defaults-store.ts";
import { channelsFor } from "./post-references.ts";
import type { UnknownChannels } from "./unknown-channels.ts";
import type { WorkspaceChannels } from "./workspace-channels.ts";

type Failure = DatabaseError | MissingPermission | UnknownChannels;

/**
 * The options a workspace's new posts take on a channel when they give
 * none there: a board, an audience, a category chosen once.
 *
 * Reading them needs post:read and channel:read; writing them post:update.
 * Defaults are the channel's platform's own options, unfinished as a
 * draft's may be. They are a starting point, never a way round the rules:
 * a post that takes them is checked when it is scheduled as one that
 * wrote them itself (`problems()`). Only a new post takes them; a draft
 * that is changed keeps what it is given.
 */
export class ChannelDefaults extends Context.Service<
  ChannelDefaults,
  {
    /** The channel's defaults, if it has any. */
    readonly get: (
      actor: Actor,
      channelId: ChannelId
    ) => Effect.Effect<Option.Option<TargetOptions>, Failure>;
    /** Keeps these as the channel's defaults, instead of any it had. */
    readonly set: (
      actor: Actor,
      channelId: ChannelId,
      options: TargetOptions
    ) => Effect.Effect<TargetOptions, Failure | PostContentRejected>;
    /** Leaves the channel without defaults. */
    readonly clear: (
      actor: Actor,
      channelId: ChannelId
    ) => Effect.Effect<void, Failure>;
  }
>()("peal-server/publishing/application/ChannelDefaults") {
  static readonly layer = Layer.effect(
    ChannelDefaults,
    Effect.gen(function* ChannelDefaultsLive() {
      const store = yield* ChannelDefaultsStore;
      const ports = yield* Effect.context<WorkspaceChannels>();

      const withPorts = Effect.provideContext(ports);

      const get = Effect.fn("ChannelDefaults.get")(function* get(
        actor: Actor,
        channelId: ChannelId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));
        yield* channelsFor(actor, [channelId]).pipe(withPorts);

        const [kept] = yield* store.among(actor.workspaceId, [channelId]);

        return Option.fromUndefinedOr(kept).pipe(
          Option.map(({ options }) => options)
        );
      });

      const set = Effect.fn("ChannelDefaults.set")(function* set(
        actor: Actor,
        channelId: ChannelId,
        options: TargetOptions
      ) {
        yield* Effect.fromResult(authorize(actor, "post:update"));

        const channels = yield* channelsFor(actor, [channelId]).pipe(withPorts);
        const defaults = new ChannelOptions({ channelId, options });

        yield* Effect.fromResult(checkSavedOptions(channels, [defaults]));
        yield* store.put(actor.workspaceId, defaults, yield* DateTime.now);

        return options;
      });

      const clear = Effect.fn("ChannelDefaults.clear")(function* clear(
        actor: Actor,
        channelId: ChannelId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:update"));
        yield* channelsFor(actor, [channelId]).pipe(withPorts);

        return yield* store.remove(actor.workspaceId, channelId);
      });

      return ChannelDefaults.of({ clear, get, set });
    })
  );
}
