import { Effect, Match } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { Api, ChannelNotFound, CurrentMember, Forbidden } from "peal-contract";

import { PostingCapabilities } from "#publishing/application/posting-capabilities.ts";
import { actorOf } from "#shared/api/actor.ts";

import {
  channelCapabilitiesView,
  platformCapabilitiesView,
} from "./capabilities-view.ts";

export const CapabilitiesHandlers = HttpApiBuilder.group(
  Api,
  "capabilities",
  Effect.fn(function* capabilitiesHandlers(handlers) {
    const capabilities = yield* PostingCapabilities;

    return handlers.handleAll({
      channel: ({ params }) =>
        Effect.gen(function* channel() {
          const actor = actorOf(yield* CurrentMember);

          const described = yield* capabilities
            .channel(actor, params.channelId)
            .pipe(
              Effect.catch((error) =>
                Match.valueTags(error, {
                  DatabaseError: Effect.die,
                  MissingPermission: () => Effect.fail(new Forbidden()),
                  UnknownChannels: () => Effect.fail(new ChannelNotFound()),
                })
              )
            );

          return channelCapabilitiesView(described);
        }),
      platforms: () =>
        Effect.gen(function* platforms() {
          const actor = actorOf(yield* CurrentMember);

          const every = yield* capabilities
            .platforms(actor)
            .pipe(Effect.mapError(() => new Forbidden()));

          return every.map(platformCapabilitiesView);
        }),
    });
  })
);
