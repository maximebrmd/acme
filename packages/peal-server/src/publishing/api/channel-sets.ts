import { Array as Arr, Effect, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  ChannelSetNameTaken,
  ChannelSetNotFound,
  CurrentMember,
  PostContentInvalid,
  TooManyChannelSets,
  UnknownChannels,
} from "peal-contract";
import type { ChannelSetDetails as DetailsInput } from "peal-contract";

import { ChannelSets } from "#publishing/application/channel-sets.ts";
import { ChannelSetIdSchema } from "#publishing/domain/channel-set-id.ts";
import type { ChannelSetDetails } from "#publishing/domain/channel-set.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";

import { channelSetView } from "./channel-set-view.ts";
import { channelIdsFrom, optionsFrom } from "./post-input.ts";

const decodeSetId = Schema.decodeUnknownOption(ChannelSetIdSchema);

const notFound = () => Effect.fail(new ChannelSetNotFound());

const nameTaken = () => Effect.fail(new ChannelSetNameTaken());

const unknownChannels = ({
  channelIds,
}: {
  readonly channelIds: readonly string[];
}) => Effect.fail(new UnknownChannels({ channelIds }));

const contentInvalid = ({ violations }: PostContentRejected) =>
  Effect.fail(new PostContentInvalid({ violations }));

/** The set a path names, or ChannelSetNotFound. */
export const channelSetIdFrom = (raw: string) =>
  Option.match(decodeSetId(raw), {
    onNone: notFound,
    onSome: Effect.succeed,
  });

/** A set as a request writes it, with its ids decoded. */
export const channelSetDetailsFrom = ({
  channelIds: raw,
  name,
  options = [],
}: DetailsInput) =>
  Effect.gen(function* decodingSet() {
    const channelIds = yield* channelIdsFrom(raw);

    // The contract asks for one channel at least.
    if (!Arr.isReadonlyArrayNonEmpty(channelIds)) {
      return yield* new UnknownChannels({ channelIds: [] });
    }

    const details: ChannelSetDetails = {
      channelIds,
      name,
      options: yield* optionsFrom(options),
    };

    return details;
  });

// A failure of the server's own (the database, a bug) is a defect: 500.
export const ChannelSetsHandlers = HttpApiBuilder.group(
  Api,
  "channelSets",
  Effect.fn(function* channelSetsHandlers(handlers) {
    const sets = yield* ChannelSets;

    return handlers.handleAll({
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);
          const details = yield* channelSetDetailsFrom(payload);

          return yield* sets.create(actor, details).pipe(
            Effect.map(channelSetView),
            Effect.catchTags({
              ChannelSetNameTaken: nameTaken,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              PostContentRejected: contentInvalid,
              TooManyChannelSets: ({ allowed }) =>
                Effect.fail(new TooManyChannelSets({ allowed })),
              UnknownChannels: unknownChannels,
            })
          );
        }),
      delete: ({ params }) =>
        Effect.gen(function* remove() {
          const actor = actorOf(yield* CurrentMember);
          const setId = yield* channelSetIdFrom(params.channelSetId);

          yield* sets.remove(actor, setId).pipe(
            Effect.catchTags({
              ChannelSetNotFound: notFound,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );
        }),
      list: () =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          return yield* sets.list(actor).pipe(
            Effect.map((all) => all.map(channelSetView)),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );
        }),
      update: ({ params, payload }) =>
        Effect.gen(function* update() {
          const actor = actorOf(yield* CurrentMember);
          const setId = yield* channelSetIdFrom(params.channelSetId);
          const details = yield* channelSetDetailsFrom(payload);

          return yield* sets.update(actor, setId, details).pipe(
            Effect.map(channelSetView),
            Effect.catchTags({
              ChannelSetNameTaken: nameTaken,
              ChannelSetNotFound: notFound,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              PostContentRejected: contentInvalid,
              UnknownChannels: unknownChannels,
            })
          );
        }),
    });
  })
);
