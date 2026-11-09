import {
  Api,
  ChannelCannotPost,
  ChannelNotFound,
  CurrentMember,
  Forbidden,
  PlatformUnreachable,
} from "acme-contract";
import { Effect, Match } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { TikTokCreatorInfo } from "#publishing/application/tiktok-creator-info.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { actorOf } from "#shared/api/actor.ts";

import { tiktokAccountView } from "./tiktok-account-view.ts";

// TikTok did not answer, or asked to slow down: logged, then 502.
const unreachable = (failure: { readonly _tag: string }) =>
  Effect.logWarning("TikTok's creator info could not be read").pipe(
    Effect.annotateLogs({ failure: failure._tag }),
    Effect.andThen(Effect.fail(new PlatformUnreachable()))
  );

export const TikTokHandlers = HttpApiBuilder.group(
  Api,
  "tiktok",
  Effect.fn(function* tiktokHandlers(handlers) {
    const info = yield* TikTokCreatorInfo;

    return handlers.handleAll({
      creator: ({ params }) =>
        Effect.gen(function* creator() {
          const actor = actorOf(yield* CurrentMember);

          const account = yield* info.read(actor, params.channelId).pipe(
            Effect.catch((error) =>
              Match.valueTags(error, {
                BadRequest: ({ code }) =>
                  Effect.fail(
                    code === ownRefusalCodes.channelDisabled
                      ? new ChannelCannotPost({ reason: "disabled" })
                      : new ChannelNotFound()
                  ),
                DatabaseError: Effect.die,
                MissingPermission: () => Effect.fail(new Forbidden()),
                PlatformUnavailable: unreachable,
                RateLimited: unreachable,
                TokenExpired: () =>
                  Effect.fail(new ChannelCannotPost({ reason: "reconnect" })),
                UnknownChannels: () => Effect.fail(new ChannelNotFound()),
              })
            )
          );

          return tiktokAccountView(account);
        }),
    });
  })
);
