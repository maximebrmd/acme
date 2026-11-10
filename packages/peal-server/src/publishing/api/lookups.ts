import { Duration, Effect, Match } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  ChannelCannotPost,
  ChannelNotFound,
  CurrentMember,
  LookupInputInvalid,
  LookupNotFound,
  PlatformRateLimited,
  PlatformUnreachable,
} from "peal-contract";

import { ChannelLookups } from "#publishing/application/channel-lookups.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import type { RateLimited } from "#shared/domain/rate-limited.ts";

import { lookupDescriptionView } from "./capabilities-view.ts";
import { lookupResultView } from "./lookup-view.ts";

// The platform did not answer: logged, then 502.
const unreachable = () =>
  Effect.logWarning("A platform did not answer a lookup").pipe(
    Effect.andThen(Effect.fail(new PlatformUnreachable()))
  );

/** How long the platform asked to wait, in whole seconds, if it said. */
export const retryAfterSecondsOf = ({ retryAfter }: RateLimited) =>
  retryAfter === undefined ? null : Math.ceil(Duration.toSeconds(retryAfter));

export const LookupsHandlers = HttpApiBuilder.group(
  Api,
  "lookups",
  Effect.fn(function* lookupsHandlers(handlers) {
    const lookups = yield* ChannelLookups;

    return handlers.handleAll({
      list: ({ params }) =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          const listed = yield* lookups.list(actor, params.channelId).pipe(
            Effect.catch((error) =>
              Match.valueTags(error, {
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                UnknownChannels: () => Effect.fail(new ChannelNotFound()),
              })
            )
          );

          return listed.map(lookupDescriptionView);
        }),
      run: ({ params, payload }) =>
        Effect.gen(function* run() {
          const actor = actorOf(yield* CurrentMember);

          const result = yield* lookups
            .run(actor, params.channelId, params.name, payload)
            .pipe(
              Effect.catch((error) =>
                Match.valueTags(error, {
                  BadRequest: ({ code }) =>
                    Effect.fail(
                      code === ownRefusalCodes.channelDisabled
                        ? new ChannelCannotPost({ reason: "disabled" })
                        : new ChannelNotFound()
                    ),
                  DatabaseError: Effect.die,
                  LookupInputRejected: () =>
                    Effect.fail(new LookupInputInvalid()),
                  MissingPermission: forbidden,
                  PlatformUnavailable: unreachable,
                  RateLimited: (limited) =>
                    Effect.logWarning("A platform rate limited a lookup").pipe(
                      Effect.andThen(
                        Effect.fail(
                          new PlatformRateLimited({
                            retryAfterSeconds: retryAfterSecondsOf(limited),
                          })
                        )
                      )
                    ),
                  TokenExpired: () =>
                    Effect.fail(new ChannelCannotPost({ reason: "reconnect" })),
                  UnknownChannels: () => Effect.fail(new ChannelNotFound()),
                  UnknownLookup: () => Effect.fail(new LookupNotFound()),
                })
              )
            );

          return lookupResultView(result);
        }),
    });
  })
);
