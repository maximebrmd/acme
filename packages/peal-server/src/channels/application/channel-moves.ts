import { Context, DateTime, Effect, Layer, Option } from "effect";

import { movedChannel } from "#channels/domain/channel.ts";
import type { Channel } from "#channels/domain/channel.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

import { ChannelAccountTaken } from "./channel-account-taken.ts";
import { ChannelAllowance } from "./channel-allowance.ts";
import { ChannelEvents } from "./channel-events.ts";
import { ChannelLocks } from "./channel-locks.ts";
import { ChannelNotFound } from "./channel-not-found.ts";
import { ChannelRepository } from "./channel-repository.ts";
import { rebindTokens } from "./channel-tokens.ts";
import type { MissingTokenKey } from "./missing-token-key.ts";
import type { TokenCipher, TokenDecryptionError } from "./token-cipher.ts";

/** What a move asks: the channel, where it is, and where it goes. */
export interface ChannelMove<E, R> {
  readonly channelId: ChannelId;
  readonly from: WorkspaceId;
  /**
   * What the caller checks inside the move's transaction, before anything
   * changes: that both workspaces may still take part, and nothing is
   * being sent through the channel. Its failure changes nothing.
   */
  readonly inside: Effect.Effect<void, E, R>;
  readonly to: WorkspaceId;
}

export type MoveFailure =
  | ChannelAccountTaken
  | ChannelNotFound
  | DatabaseError
  | MissingTokenKey
  | TokenDecryptionError;

/**
 * Moves a channel to another workspace of its pool (the workspaces that
 * count their channels together: a partner's), as a channel of its own
 * there. Who may, and between which workspaces, is the caller's to decide
 * (the workspace context's, for a partner's customers); it checks no
 * permission.
 *
 * It is a new channel in the workspace it goes to, with a new id, the same
 * account, tokens, scopes and status, and the old one gone: for the
 * workspace it leaves, a disconnection (`ChannelEvents.disconnected`,
 * `moved`), so what follows a channel gone follows it there (its posts
 * waiting fail as a disconnected channel's, analytics keeps its numbers a
 * week, the inbox ends its threads); for the other, a new connection
 * (`ChannelEvents.connected`), with nothing read before. The tokens are
 * decrypted for the old id and encrypted for the new one (`rebindTokens`),
 * so neither row's copy opens as the other's, and the platform is asked
 * nothing: the grant stays.
 *
 * It runs on the path that adds a channel: under the channel's lock, so no
 * renewal rotates its tokens meanwhile, in one transaction holding both
 * workspaces' additions (by id, so two moves the other way round take
 * turns), the old row deleted before the new one is added, then counted
 * for billing with the pool (`ChannelAllowance.counted`): the pool holds
 * as many accounts as before, so no plan limit refuses it, and the day's
 * account-days hold it once.
 */
export class ChannelMoves extends Context.Service<
  ChannelMoves,
  {
    readonly move: <E, R>(
      move: ChannelMove<E, R>
    ) => Effect.Effect<Channel, E | MoveFailure, R>;
  }
>()("peal-server/channels/application/ChannelMoves") {
  static readonly layer = Layer.effect(
    ChannelMoves,
    Effect.gen(function* ChannelMovesLive() {
      const channels = yield* ChannelRepository;
      const locks = yield* ChannelLocks;
      const events = yield* ChannelEvents;
      const allowance = yield* ChannelAllowance;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<Ids | TokenCipher>();

      // The accounts the pool holds now, the workspace's and those it
      // shares its plan with, held since `addingTo` asked.
      const pooled = (workspaceId: WorkspaceId) =>
        allowance.sharedWith(workspaceId).pipe(
          Effect.flatMap((others) =>
            channels.countIn([workspaceId, ...others])
          ),
          Effect.map((counts) =>
            [...counts.values()].reduce((total, count) => total + count, 0)
          )
        );

      // Both workspaces' additions held, the smaller id first.
      const addingToBoth = <A, E, R>(
        first: WorkspaceId,
        second: WorkspaceId,
        adding: Effect.Effect<A, E, R>
      ) => {
        const [lower, higher] =
          first < second ? [first, second] : [second, first];

        return channels.addingTo(lower, channels.addingTo(higher, adding));
      };

      const move = Effect.fn("ChannelMoves.move")(function* move<E, R>(
        asked: ChannelMove<E, R>
      ) {
        const notFound = new ChannelNotFound({ channelId: asked.channelId });

        const found = yield* channels.findById(asked.from, asked.channelId);

        if (Option.isNone(found)) {
          return yield* notFound;
        }

        const id = yield* newId(ChannelIdSchema);

        const moving = Effect.gen(function* moving() {
          yield* asked.inside;

          // As it is now, under its lock: renewed, or gone, meanwhile.
          const channel = yield* channels.findById(asked.from, asked.channelId);

          const credentials = yield* channels.credentials(asked.channelId);

          if (Option.isNone(channel) || Option.isNone(credentials)) {
            return yield* notFound;
          }

          const moved = movedChannel(
            channel.value,
            { id, workspaceId: asked.to },
            yield* DateTime.now
          );

          const rebound = yield* rebindTokens(
            credentials.value,
            channel.value.id,
            moved.id
          );

          return yield* addingToBoth(
            asked.from,
            asked.to,
            Effect.gen(function* changing() {
              // Asked under the additions' hold: no channel of the account
              // is added there before this ends.
              const there = yield* channels.findByAccount(
                asked.to,
                moved.platform,
                moved.accountId
              );

              if (Option.isSome(there)) {
                return yield* new ChannelAccountTaken({
                  channelId: there.value.id,
                });
              }

              yield* channels.remove(asked.from, channel.value.id);
              yield* events.disconnected(channel.value, "moved");
              // Every insert takes the additions this holds: a channel of
              // the account there meanwhile would be a bug.
              yield* channels
                .insert(moved, rebound)
                .pipe(Effect.catchTag("ChannelAlreadyConnected", Effect.die));
              yield* allowance.counted(asked.to, pooled(asked.to));
              yield* events.connected(moved, false);

              return moved;
            })
          );
        });

        return yield* locks.withLock(asked.channelId, transaction(moving));
      }, Effect.provideContext(ports));

      return ChannelMoves.of({ move });
    })
  );
}
