import { Context, DateTime, Effect, Latch, Layer, Option, Ref } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { LivePostClients } from "#publishing/application/live-post-clients.ts";
import type {
  RemovalFailure,
  RemovalOutcome,
  RemovalRequest,
} from "#publishing/application/live-post-clients.ts";
import { LivePostEvents } from "#publishing/application/live-post-events.ts";
import { LivePostHolds } from "#publishing/application/live-post-holds.ts";
import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import type {
  CredentialFailure,
  PublishingAccount,
} from "#publishing/application/platform-credentials.ts";
import type { LivePostChange } from "#publishing/domain/live-post-change.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";

/** How the fake platform answers one deletion. */
export type RemovalBehaviour =
  | { readonly _tag: "answer"; readonly outcome: RemovalOutcome }
  | { readonly _tag: "fail"; readonly failure: RemovalFailure }
  // The answer comes once the test calls `release`, if ever.
  | { readonly _tag: "hang" };

/** A deletion the fake platform received. */
export interface RemovalCall {
  readonly at: DateTime.Utc;
  readonly request: RemovalRequest;
}

/**
 * A platform that deletes posts, scripted per channel: each call takes the
 * next behaviour scripted for its channel, and deletes once none is left.
 */
export class FakeRemovals extends Context.Service<
  FakeRemovals,
  {
    readonly calls: Effect.Effect<readonly RemovalCall[]>;
    readonly script: (
      channelId: ChannelId,
      behaviours: readonly RemovalBehaviour[]
    ) => Effect.Effect<void>;
    /** Lets the calls hanging on the channel answer. */
    readonly release: (channelId: ChannelId) => Effect.Effect<void>;
    /** Holds the target, as a boost that is not over would. */
    readonly hold: (targetId: PostTargetId) => Effect.Effect<void>;
    readonly isHeld: (targetId: PostTargetId) => Effect.Effect<boolean>;
    /** What LivePostEvents was told, in order. */
    readonly told: Effect.Effect<readonly ToldChange[]>;
    readonly tell: (told: ToldChange) => Effect.Effect<void>;
  }
>()("test/publishing/FakeRemovals") {}

/** A change LivePostEvents was told of. */
export interface ToldChange {
  readonly change: LivePostChange;
  readonly event: "unpublishFailed" | "unpublished";
  readonly target: PostTarget;
}

/** FakeRemovals with the LivePostClients the gates call. */
export const FakeLivePostClients = Layer.effectContext(
  Effect.gen(function* FakeLivePostClients() {
    const calls = yield* Ref.make<readonly RemovalCall[]>([]);

    const scripts = yield* Ref.make<
      ReadonlyMap<ChannelId, readonly RemovalBehaviour[]>
    >(new Map());

    const latches = yield* Ref.make<ReadonlyMap<ChannelId, Latch.Latch>>(
      new Map()
    );

    const held = yield* Ref.make<ReadonlySet<PostTargetId>>(new Set());
    const told = yield* Ref.make<readonly ToldChange[]>([]);

    const latchOf = (channelId: ChannelId) =>
      Effect.gen(function* findLatch() {
        const existing = (yield* Ref.get(latches)).get(channelId);

        if (existing !== undefined) {
          return existing;
        }

        const latch = yield* Latch.make(false);

        yield* Ref.update(latches, (all) => new Map(all).set(channelId, latch));

        return latch;
      });

    const nextBehaviour = (channelId: ChannelId) =>
      Ref.modify(scripts, (all) => {
        const [first, ...rest] = all.get(channelId) ?? [];

        return [
          Option.fromUndefinedOr(first),
          new Map(all).set(channelId, rest),
        ] as const;
      });

    const remove = (
      request: RemovalRequest
    ): Effect.Effect<RemovalOutcome, RemovalFailure> =>
      Effect.gen(function* removing() {
        const at = yield* DateTime.now;

        yield* Ref.update(calls, (all) => [...all, { at, request }]);

        const behaviour = yield* nextBehaviour(request.channelId);

        if (Option.isNone(behaviour)) {
          return "removed" as const;
        }

        const chosen = behaviour.value;

        if (chosen._tag === "fail") {
          return yield* Effect.fail(chosen.failure);
        }

        if (chosen._tag === "hang") {
          yield* (yield* latchOf(request.channelId)).await;

          return "removed" as const;
        }

        return chosen.outcome;
      });

    return Context.make(LivePostClients, LivePostClients.of({ remove })).pipe(
      Context.add(
        FakeRemovals,
        FakeRemovals.of({
          calls: Ref.get(calls),
          hold: (targetId) =>
            Ref.update(held, (all) => new Set(all).add(targetId)),
          isHeld: (targetId) =>
            Ref.get(held).pipe(Effect.map((all) => all.has(targetId))),
          release: (channelId) =>
            latchOf(channelId).pipe(Effect.flatMap((latch) => latch.open)),
          script: (channelId, behaviours) =>
            Ref.update(scripts, (all) =>
              new Map(all).set(channelId, [
                ...(all.get(channelId) ?? []),
                ...behaviours,
              ])
            ),
          tell: (change) => Ref.update(told, (all) => [...all, change]),
          told: Ref.get(told),
        })
      )
    );
  })
);

/** What holds a target: what the test held through FakeRemovals. */
export const FakeHolds = Layer.effect(
  LivePostHolds,
  FakeRemovals.use((removals) =>
    Effect.succeed(
      LivePostHolds.of({
        ofTarget: (targetId) =>
          removals
            .isHeld(targetId)
            .pipe(
              Effect.map((isHeld) =>
                isHeld ? Option.some("boostRunning" as const) : Option.none()
              )
            ),
      })
    )
  )
);

/** LivePostEvents that FakeRemovals records. */
export const RecordedLiveEvents = Layer.effect(
  LivePostEvents,
  FakeRemovals.use((removals) =>
    Effect.succeed(
      LivePostEvents.of({
        unpublishFailed: (change, target) =>
          removals.tell({ change, event: "unpublishFailed", target }),
        unpublished: (change, target) =>
          removals.tell({ change, event: "unpublished", target }),
      })
    )
  )
);

const disconnected = (): Effect.Effect<never, BadRequest> =>
  Effect.fail(new BadRequest({ code: ownRefusalCodes.channelDisconnected }));

/**
 * The channels' credentials as their rows say: a channel gone is
 * disconnected, one turned off is disabled, one to reconnect has no
 * token. No token is handed out: these tests call no real platform.
 */
export const RepositoryCredentials = Layer.effect(
  PlatformCredentials,
  Effect.gen(function* RepositoryCredentials() {
    const channels = yield* ChannelRepository;

    const account = (
      channelId: ChannelId
    ): Effect.Effect<PublishingAccount, CredentialFailure> =>
      channels.get(channelId).pipe(
        Effect.orDie,
        Effect.flatMap(
          Option.match({
            onNone: disconnected,
            onSome: (
              channel
            ): Effect.Effect<PublishingAccount, CredentialFailure> => {
              const { status } = channel;

              if (status._tag === "disabled") {
                return Effect.fail(
                  new BadRequest({ code: ownRefusalCodes.channelDisabled })
                );
              }

              return status._tag === "refreshNeeded"
                ? Effect.fail(new TokenExpired())
                : Effect.succeed({
                    accountId: channel.accountId,
                    connection: channel.connection,
                    platform: channel.platform,
                  });
            },
          })
        )
      );

    return PlatformCredentials.of({
      account,
      withToken: <A, E, R>(
        channelId: ChannelId,
        _use: (token: never) => Effect.Effect<A, E | TokenRejected, R>
      ) => account(channelId).pipe(Effect.andThen(disconnected())),
    });
  })
);
