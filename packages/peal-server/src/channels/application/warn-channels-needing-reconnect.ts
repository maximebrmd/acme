import { Context, DateTime, Effect, Layer, Option } from "effect";

import {
  isTokenExpired,
  markRefreshNeeded,
  reconnectLeadTime,
  reconnectWarning,
} from "#channels/domain/channel.ts";
import type { Channel } from "#channels/domain/channel.ts";

import { ChannelLocks } from "./channel-locks.ts";
import { ChannelNotices } from "./channel-notices.ts";
import { ChannelRepository, reconnectCursorOf } from "./channel-repository.ts";
import type { ReconnectCursor } from "./channel-repository.ts";

// Channels handled at once, and read from the database at a time. A run
// takes page after page until none is left: with a cap, the channels it
// stopped at would come back first the next day, already warned, and those
// after them would expire unwarned.
const concurrency = 4;

const pageSize = 200;

/** How many channels a run warned about, and how. */
export interface WarningReport {
  readonly expired: number;
  readonly reconnectRequired: number;
  readonly reconnectSoon: number;
}

type Warned = "expired" | "reconnectRequired" | "reconnectSoon" | "none";

/**
 * The daily check on tokens that cannot be renewed: a workspace hears once
 * that a channel's token is about to expire (`reconnectWarning` in the
 * domain), and once that it has, when the channel is marked `refreshNeeded`.
 * Channels already marked are notified again only if their notice was never
 * sent, as when the mail transport was down.
 */
export class WarnChannelsNeedingReconnect extends Context.Service<
  WarnChannelsNeedingReconnect,
  { readonly run: Effect.Effect<WarningReport> }
>()("peal-server/channels/application/WarnChannelsNeedingReconnect") {
  static readonly layer = Layer.effect(
    WarnChannelsNeedingReconnect,
    Effect.gen(function* WarnChannelsNeedingReconnectLive() {
      const channels = yield* ChannelRepository;
      const locks = yield* ChannelLocks;
      const notices = yield* ChannelNotices;

      // An expired token is marked under the channel's lock, re-read first:
      // a reconnect meanwhile gave it a new one.
      const markExpired = Effect.fn("WarnChannelsNeedingReconnect.expire")(
        function* markExpired(channel: Channel) {
          const marked = yield* locks.withLock(
            channel.id,
            Effect.gen(function* marking() {
              const current = yield* channels.get(channel.id);
              const now = yield* DateTime.now;

              if (
                Option.isNone(current) ||
                current.value.status._tag !== "active" ||
                !isTokenExpired(current.value, now)
              ) {
                return Option.none<Channel>();
              }

              const updated = markRefreshNeeded(current.value, now);

              yield* channels.update(updated, Option.none());

              return Option.some(updated);
            })
          );

          if (Option.isNone(marked)) {
            return "none" satisfies Warned;
          }

          yield* notices.reconnectRequired(marked.value);

          return "expired" satisfies Warned;
        }
      );

      const warn = Effect.fn("WarnChannelsNeedingReconnect.warn")(
        function* warn(channel: Channel, now: DateTime.Utc) {
          if (channel.status._tag === "refreshNeeded") {
            yield* notices.reconnectRequired(channel);

            return "reconnectRequired" satisfies Warned;
          }

          if (isTokenExpired(channel, now)) {
            return yield* markExpired(channel);
          }

          const expiresAt = reconnectWarning(channel, now);

          if (Option.isNone(expiresAt)) {
            return "none" satisfies Warned;
          }

          yield* notices.reconnectSoon(channel, expiresAt.value);

          return "reconnectSoon" satisfies Warned;
        }
      );

      const warnPage = (
        page: readonly Channel[],
        now: DateTime.Utc
      ): Effect.Effect<readonly Warned[]> =>
        Effect.forEach(
          page,
          (channel) =>
            warn(channel, now).pipe(
              Effect.catchCause((cause) =>
                Effect.logWarning(
                  "Warning about a channel to reconnect failed",
                  cause
                ).pipe(
                  Effect.annotateLogs({ channelId: channel.id }),
                  Effect.as<Warned>("none")
                )
              )
            ),
          { concurrency }
        );

      const run = Effect.gen(function* run() {
        const now = yield* DateTime.now;
        const warned: Warned[] = [];

        // A channel this run marks changes, and comes back among the
        // marked ones further on: it was told already.
        const handled = new Set<Channel["id"]>();
        let after = Option.none<ReconnectCursor>();

        while (true) {
          const page = yield* channels.needingReconnect({
            after,
            leadTime: reconnectLeadTime,
            limit: pageSize,
            now,
          });

          const fresh = page.filter((channel) => !handled.has(channel.id));

          for (const channel of fresh) {
            handled.add(channel.id);
          }

          warned.push(...(yield* warnPage(fresh, now)));
          after = Option.map(
            Option.fromUndefinedOr(page.at(-1)),
            reconnectCursorOf
          );

          if (page.length < pageSize) {
            break;
          }
        }

        const count = (outcome: Warned) =>
          warned.filter((value) => value === outcome).length;

        const report: WarningReport = {
          expired: count("expired"),
          reconnectRequired: count("reconnectRequired"),
          reconnectSoon: count("reconnectSoon"),
        };

        return report;
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("The reconnect warnings failed", cause).pipe(
            Effect.as<WarningReport>({
              expired: 0,
              reconnectRequired: 0,
              reconnectSoon: 0,
            })
          )
        ),
        Effect.withSpan("WarnChannelsNeedingReconnect.run")
      );

      return WarnChannelsNeedingReconnect.of({ run });
    })
  );
}
