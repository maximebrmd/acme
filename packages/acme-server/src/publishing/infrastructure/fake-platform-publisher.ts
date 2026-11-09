import { Context, DateTime, Effect, Latch, Layer, Match, Ref } from "effect";

import { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import type { PublishRequest } from "#publishing/application/platform-publisher.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";

/** How the fake platform answers one call. */
export type FakeBehaviour =
  // The post goes live and the platform says so.
  | { readonly _tag: "succeed" }
  // The platform refuses the post: nothing goes live.
  | { readonly _tag: "fail"; readonly failure: PublishFailure }
  // The post goes live, and the answer only comes once the test calls
  // `release` for the channel, if ever.
  | { readonly _tag: "hang" }
  // The post goes live and the answer is lost, as after a timeout: the
  // adapter can only say it does not know.
  | { readonly _tag: "loseResponse" };

/** A call the fake platform received. */
export interface FakeCall {
  readonly at: DateTime.Utc;
  readonly request: PublishRequest;
}

interface FakeState {
  readonly calls: readonly FakeCall[];
  // Calls hanging until `release`, per channel.
  readonly held: ReadonlyMap<ChannelId, readonly Latch.Latch[]>;
  readonly inFlight: ReadonlyMap<ChannelId, number>;
  // Requests whose post went live, in order.
  readonly live: readonly PublishRequest[];
  readonly mostInFlight: number;
  readonly scripts: ReadonlyMap<ChannelId, readonly FakeBehaviour[]>;
}

const initial: FakeState = {
  calls: [],
  held: new Map(),
  inFlight: new Map(),
  live: [],
  mostInFlight: 0,
  scripts: new Map(),
};

const withEntry = <K, V>(map: ReadonlyMap<K, V>, key: K, value: V) =>
  new Map(map).set(key, value);

/**
 * A platform for tests and local runs, scripted per channel: each call takes
 * the next behaviour scripted for its channel, and succeeds once none is left.
 * It records every call, the posts that went live, and the most calls it
 * served at once on one channel.
 */
export class FakePlatform extends Context.Service<
  FakePlatform,
  {
    /** Every call received, in order. */
    readonly calls: Effect.Effect<readonly FakeCall[]>;
    /** The posts that went live, in order, answered or not. */
    readonly live: Effect.Effect<readonly PublishRequest[]>;
    /** The most calls in flight at once on a single channel. */
    readonly mostInFlight: Effect.Effect<number>;
    readonly publisher: PlatformPublisher["Service"];
    /** Answers the calls hanging on `channelId`: published. */
    readonly release: (channelId: ChannelId) => Effect.Effect<void>;
    /** Queues behaviours for the next calls on `channelId`. */
    readonly script: (
      channelId: ChannelId,
      behaviours: readonly FakeBehaviour[]
    ) => Effect.Effect<void>;
  }
>()("acme-server/publishing/infrastructure/FakePlatform") {
  static readonly layer = Layer.effect(
    FakePlatform,
    Effect.gen(function* FakePlatformLive() {
      const state = yield* Ref.make(initial);

      const nextBehaviour = (channelId: ChannelId) =>
        Ref.modify(state, (current): [FakeBehaviour, FakeState] => {
          const [next, ...rest] = current.scripts.get(channelId) ?? [];

          return [
            next ?? { _tag: "succeed" },
            {
              ...current,
              scripts: withEntry(current.scripts, channelId, rest),
            },
          ];
        });

      const enter = (call: FakeCall) =>
        Ref.update(state, (current) => {
          const { channelId } = call.request;
          const inFlight = (current.inFlight.get(channelId) ?? 0) + 1;

          return {
            ...current,
            calls: [...current.calls, call],
            inFlight: withEntry(current.inFlight, channelId, inFlight),
            mostInFlight: Math.max(current.mostInFlight, inFlight),
          };
        });

      const leave = (channelId: ChannelId) =>
        Ref.update(state, (current) => ({
          ...current,
          inFlight: withEntry(
            current.inFlight,
            channelId,
            (current.inFlight.get(channelId) ?? 1) - 1
          ),
        }));

      // The post is live on the platform: the id is its place in the list.
      const goLive = (request: PublishRequest) =>
        Ref.modify(state, (current): [PublishResult, FakeState] => [
          {
            _tag: "published",
            platformPostId: PlatformPostIdSchema.make(
              `fake-${current.live.length + 1}`
            ),
          },
          { ...current, live: [...current.live, request] },
        ]);

      const holdUntilReleased = (channelId: ChannelId) =>
        Effect.gen(function* holding() {
          const released = yield* Latch.make();

          yield* Ref.update(state, (current) => ({
            ...current,
            held: withEntry(current.held, channelId, [
              ...(current.held.get(channelId) ?? []),
              released,
            ]),
          }));

          yield* released.await;
        });

      const answer = (request: PublishRequest, behaviour: FakeBehaviour) =>
        Match.valueTags(behaviour, {
          fail: ({ failure }) => Effect.fail(failure),
          hang: () =>
            goLive(request).pipe(
              Effect.tap(() => holdUntilReleased(request.channelId))
            ),
          loseResponse: () =>
            goLive(request).pipe(
              Effect.as<PublishResult>({
                _tag: "unconfirmed",
                reason: "noResponse",
              })
            ),
          succeed: () => goLive(request),
        });

      const publish = (request: PublishRequest) =>
        Effect.gen(function* answering() {
          yield* enter({ at: yield* DateTime.now, request });

          const behaviour = yield* nextBehaviour(request.channelId);

          return yield* answer(request, behaviour);
        }).pipe(Effect.ensuring(leave(request.channelId)));

      const release = (channelId: ChannelId) =>
        Ref.modify(state, (current): [readonly Latch.Latch[], FakeState] => [
          current.held.get(channelId) ?? [],
          { ...current, held: withEntry(current.held, channelId, []) },
        ]).pipe(
          Effect.flatMap((held) =>
            Effect.all(held.map((released) => released.open))
          ),
          Effect.asVoid
        );

      return FakePlatform.of({
        calls: Ref.get(state).pipe(Effect.map(({ calls }) => calls)),
        live: Ref.get(state).pipe(Effect.map(({ live }) => live)),
        mostInFlight: Ref.get(state).pipe(
          Effect.map(({ mostInFlight }) => mostInFlight)
        ),
        publisher: PlatformPublisher.of({ publish }),
        release,
        script: (channelId, behaviours) =>
          Ref.update(state, (current) => ({
            ...current,
            scripts: withEntry(current.scripts, channelId, [
              ...(current.scripts.get(channelId) ?? []),
              ...behaviours,
            ]),
          })),
      });
    })
  );
}

/** The fake platform as the PlatformPublisher, with FakePlatform to script it. */
export const FakePlatformPublisher = Layer.effect(
  PlatformPublisher,
  FakePlatform.use((platform) => Effect.succeed(platform.publisher))
).pipe(Layer.provideMerge(FakePlatform.layer));
