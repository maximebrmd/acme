import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import { disable, enable, labelled } from "#channels/domain/channel.ts";
import type { Channel } from "#channels/domain/channel.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ChannelLocks } from "./channel-locks.ts";
import { ChannelNotFound } from "./channel-not-found.ts";
import { ChannelRepository } from "./channel-repository.ts";

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

type Failure = ChannelNotFound | DatabaseError | MissingPermission;

const gone = (channelId: string) => (written: boolean) =>
  written ? Effect.void : Effect.fail(new ChannelNotFound({ channelId }));

/**
 * What a workspace decides about a channel it keeps: the name it calls it
 * by, and whether it is on. Needs channel:connect, as connecting and
 * reconnecting do. An id that names no channel of the workspace, including
 * one that is not a channel id at all, is ChannelNotFound.
 *
 * A channel turned off posts nothing: a post that reaches its time on it
 * fails there (`channelDisabled`) and goes out on its other channels. It
 * keeps its tokens, its history and its place in the plan's count, and is
 * warned of nothing meanwhile. Turned back on, it posts again, or asks to
 * be reconnected when its token stopped working or ran out meanwhile
 * (`enable`, in the domain). Its status is written alone, under the
 * channel's lock, so a token renewal running then keeps what it wrote.
 */
export class ChannelSettings extends Context.Service<
  ChannelSettings,
  {
    /** Gives the channel a name of the workspace's own, or none. */
    readonly rename: (
      actor: Actor,
      channelId: string,
      label: Option.Option<string>
    ) => Effect.Effect<Channel, Failure>;
    /** Turns the channel off. One already off stays as it is. */
    readonly turnOff: (
      actor: Actor,
      channelId: string
    ) => Effect.Effect<Channel, Failure>;
    /** Turns the channel back on. One that is on stays as it is. */
    readonly turnOn: (
      actor: Actor,
      channelId: string
    ) => Effect.Effect<Channel, Failure>;
  }
>()("peal-server/channels/application/ChannelSettings") {
  static readonly layer = Layer.effect(
    ChannelSettings,
    Effect.gen(function* ChannelSettingsLive() {
      const channels = yield* ChannelRepository;
      const locks = yield* ChannelLocks;

      // The workspace's channel the id names, for whoever manages channels.
      const managed = Effect.fn("ChannelSettings.managed")(function* managed(
        actor: Actor,
        channelId: string
      ) {
        yield* Effect.fromResult(authorize(actor, "channel:connect"));

        const found = yield* Option.match(decodeChannelId(channelId), {
          onNone: () => Effect.succeed(Option.none<Channel>()),
          onSome: (id) => channels.findById(actor.workspaceId, id),
        });

        return yield* Option.match(found, {
          onNone: () => Effect.fail(new ChannelNotFound({ channelId })),
          onSome: Effect.succeed,
        });
      });

      const rename = Effect.fn("ChannelSettings.rename")(function* rename(
        actor: Actor,
        channelId: string,
        label: Option.Option<string>
      ) {
        const channel = yield* managed(actor, channelId);
        const now = yield* DateTime.now;

        yield* channels
          .setLabel(actor.workspaceId, channel.id, label, now)
          .pipe(Effect.flatMap(gone(channelId)));

        return labelled(channel, label, now);
      });

      // Reads the channel again under its lock, so the switch is made on
      // what a renewal or a reconnect just wrote.
      const switched = (
        actor: Actor,
        channelId: string,
        change: (channel: Channel, now: DateTime.Utc) => Channel
      ) =>
        Effect.gen(function* switching() {
          const { id } = yield* managed(actor, channelId);

          return yield* locks.withLock(
            id,
            Effect.gen(function* underLock() {
              const current = yield* managed(actor, channelId);
              const next = change(current, yield* DateTime.now);

              // Already as asked: nothing to write.
              if (next === current) {
                return current;
              }

              yield* channels
                .setStatus(next)
                .pipe(Effect.flatMap(gone(channelId)));

              return next;
            })
          );
        });

      return ChannelSettings.of({
        rename,
        turnOff: (actor, channelId) =>
          switched(actor, channelId, disable).pipe(
            Effect.withSpan("ChannelSettings.turnOff")
          ),
        turnOn: (actor, channelId) =>
          switched(actor, channelId, enable).pipe(
            Effect.withSpan("ChannelSettings.turnOn")
          ),
      });
    })
  );
}
