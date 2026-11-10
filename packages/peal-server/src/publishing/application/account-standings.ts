import { Context, Effect, Layer } from "effect";

import type {
  AccountStanding,
  AccountUnreadReason,
} from "#publishing/domain/account-restriction.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import {
  creatorRestrictions,
  photosRefused,
} from "#publishing/domain/tiktok-creator.ts";

import { TikTokCreators } from "./tiktok-creators.ts";

const unread = (reason: AccountUnreadReason): AccountStanding => ({
  _tag: "unread",
  reason,
});

const unrestricted: AccountStanding = { _tag: "unrestricted" };

/**
 * What a channel's own account narrows in its platform's rules, asked of
 * the platform now: the restrictions `AccountRules` checks when a post is
 * scheduled, said beforehand. A platform that cannot be asked answers
 * `unread` with the reason, never a failure: the platform's own rules are
 * still worth telling.
 */
export class AccountStandings extends Context.Service<
  AccountStandings,
  {
    readonly read: (
      channel: ChannelOnPlatform
    ) => Effect.Effect<AccountStanding>;
  }
>()("peal-server/publishing/application/AccountStandings") {
  /** No platform asks accounts anything. */
  static readonly none = Layer.succeed(
    AccountStandings,
    AccountStandings.of({ read: () => Effect.succeed(unrestricted) })
  );

  /** TikTok creators' settings, read through TikTokCreators. */
  static readonly layer = Layer.effect(
    AccountStandings,
    Effect.gen(function* AccountStandingsLive() {
      const creators = yield* TikTokCreators;

      const tiktok = (channel: ChannelOnPlatform) =>
        creators.read(channel.channelId).pipe(
          Effect.map((posting): AccountStanding =>
            posting._tag === "blocked"
              ? {
                  _tag: "read",
                  blocked: posting.reason,
                  restrictions: photosRefused(creators.takesPhotos),
                }
              : {
                  _tag: "read",
                  blocked: undefined,
                  restrictions: creatorRestrictions(
                    posting.creator,
                    creators.takesPhotos
                  ),
                }
          ),
          Effect.catchTags({
            BadRequest: ({ code }) =>
              Effect.succeed(
                unread(
                  code === ownRefusalCodes.channelDisabled
                    ? "disabled"
                    : "disconnected"
                )
              ),
            PlatformUnavailable: () =>
              Effect.succeed(unread("platformUnreachable")),
            RateLimited: () => Effect.succeed(unread("rateLimited")),
            TokenExpired: () => Effect.succeed(unread("reconnect")),
          })
        );

      return AccountStandings.of({
        read: (channel) =>
          channel.platform === "tiktok"
            ? tiktok(channel)
            : Effect.succeed(unrestricted),
      });
    })
  );
}
