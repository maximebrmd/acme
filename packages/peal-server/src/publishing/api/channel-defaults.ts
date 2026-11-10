import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  ChannelNotFound,
  CurrentMember,
  PostContentInvalid,
} from "peal-contract";

import { ChannelDefaults } from "#publishing/application/channel-defaults.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import { TargetOptionsSchema } from "#publishing/domain/target-options.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

// The contract checks the same limits as the domain, so options that
// passed it always decode.
const decodeOptions = Schema.decodeUnknownEffect(TargetOptionsSchema);

// The domain's options, as plain values the contract describes.
const encodeOptions = Schema.encodeSync(TargetOptionsSchema);

const notFound = () => Effect.fail(new ChannelNotFound());

const contentInvalid = ({ violations }: PostContentRejected) =>
  Effect.fail(new PostContentInvalid({ violations }));

// The channel a path names, or ChannelNotFound: a malformed id names none.
const channelIdFrom = (raw: string) =>
  Option.match(decodeChannelId(raw), {
    onNone: notFound,
    onSome: Effect.succeed,
  });

// A failure of the server's own (the database, a bug) is a defect: 500.
export const ChannelDefaultsHandlers = HttpApiBuilder.group(
  Api,
  "channelDefaults",
  Effect.fn(function* channelDefaultsHandlers(handlers) {
    const defaults = yield* ChannelDefaults;

    return handlers.handleAll({
      clear: ({ params }) =>
        Effect.gen(function* clear() {
          const actor = actorOf(yield* CurrentMember);
          const channelId = yield* channelIdFrom(params.channelId);

          yield* defaults.clear(actor, channelId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              UnknownChannels: notFound,
            })
          );
        }),
      get: ({ params }) =>
        Effect.gen(function* get() {
          const actor = actorOf(yield* CurrentMember);
          const channelId = yield* channelIdFrom(params.channelId);

          const kept = yield* defaults.get(actor, channelId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              UnknownChannels: notFound,
            })
          );

          return {
            options: kept.pipe(Option.map(encodeOptions), Option.getOrNull),
          };
        }),
      set: ({ params, payload }) =>
        Effect.gen(function* set() {
          const actor = actorOf(yield* CurrentMember);
          const channelId = yield* channelIdFrom(params.channelId);

          const options = yield* decodeOptions(payload.options).pipe(
            Effect.orDie
          );

          const kept = yield* defaults.set(actor, channelId, options).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              PostContentRejected: contentInvalid,
              UnknownChannels: notFound,
            })
          );

          return { options: encodeOptions(kept) };
        }),
    });
  })
);
