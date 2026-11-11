import { Context, Effect, Layer, Option } from "effect";

import type {
  AccountStanding,
  AccountUnreadReason,
} from "#publishing/domain/account-restriction.ts";
import { gateRestrictions } from "#publishing/domain/bluesky-gates.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import {
  creatorRestrictions,
  photosRefused,
} from "#publishing/domain/tiktok-creator.ts";

import { ChannelGrants } from "./channel-grants.ts";
import { PlatformLookups } from "./platform-lookups.ts";

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

  /**
   * TikTok creators' settings, read as the `tiktokCreator` lookup, through
   * the lookups as the server paces them (`pacedLookups`): describing a
   * channel again within a minute asks TikTok nothing, and past its pace
   * the standing is `unread`, never another request. A Bluesky channel's
   * gates, from the scopes it granted (ChannelGrants).
   */
  static readonly layer = Layer.effect(
    AccountStandings,
    Effect.gen(function* AccountStandingsLive() {
      const lookups = yield* PlatformLookups;
      const grants = yield* ChannelGrants;

      const tiktok = (channel: ChannelOnPlatform) =>
        lookups.run(channel.channelId, { _tag: "tiktokCreator" }).pipe(
          Effect.map((answer): AccountStanding => {
            const [item] = answer._tag === "tiktokCreator" ? answer.items : [];

            if (item === undefined) {
              return unread("platformUnreachable");
            }

            return item.posting._tag === "blocked"
              ? {
                  _tag: "read",
                  blocked: item.posting.reason,
                  restrictions: photosRefused(item.takesPhotos),
                }
              : {
                  _tag: "read",
                  blocked: undefined,
                  restrictions: creatorRestrictions(
                    item.posting.creator,
                    item.takesPhotos
                  ),
                };
          }),
          Effect.catchTags({
            BadRequest: ({ code }) =>
              Effect.succeed(
                unread(
                  code === ownRefusalCodes.channelDisabled
                    ? "disabled"
                    : "disconnected"
                )
              ),
            LookupInputRejected: () =>
              Effect.succeed(unread("platformUnreachable")),
            PlatformUnavailable: () =>
              Effect.succeed(unread("platformUnreachable")),
            RateLimited: () => Effect.succeed(unread("rateLimited")),
            TokenExpired: () => Effect.succeed(unread("reconnect")),
          })
        );

      // The gates a Bluesky channel's scopes do not cover: read from what
      // the channels context stored, asking Bluesky nothing.
      const bluesky = (channel: ChannelOnPlatform) =>
        grants.scopesOf(channel.channelId).pipe(
          Effect.map(
            Option.match({
              onNone: () => unrestricted,
              onSome: (scopes): AccountStanding => {
                const restrictions = gateRestrictions(scopes);

                return restrictions.length === 0
                  ? unrestricted
                  : { _tag: "read", blocked: undefined, restrictions };
              },
            })
          )
        );

      return AccountStandings.of({
        read: (channel) => {
          if (channel.platform === "tiktok") {
            return tiktok(channel);
          }

          return channel.platform === "bluesky"
            ? bluesky(channel)
            : Effect.succeed(unrestricted);
        },
      });
    })
  );
}
