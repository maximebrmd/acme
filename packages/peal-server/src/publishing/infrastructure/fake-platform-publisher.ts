import { Context, DateTime, Effect, Latch, Layer, Match, Ref } from "effect";

import { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import type { PublishRequest } from "#publishing/application/platform-publisher.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
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
  // The call stalls before it reaches the platform: nothing goes live, and
  // once the test calls `release`, if ever, the platform is unavailable.
  | { readonly _tag: "stall" }
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
  // Channels whose resumed calls look the post up by its key.
  readonly lookUps: ReadonlySet<ChannelId>;
  readonly mostInFlight: number;
  // Calls resumed after an earlier run left them in flight, in order.
  readonly resumes: readonly PublishRequest[];
  readonly scripts: ReadonlyMap<ChannelId, readonly FakeBehaviour[]>;
}

const initial: FakeState = {
  calls: [],
  held: new Map(),
  inFlight: new Map(),
  live: [],
  lookUps: new Set(),
  mostInFlight: 0,
  resumes: [],
  scripts: new Map(),
};

const withEntry = <K, V>(map: ReadonlyMap<K, V>, key: K, value: V) =>
  new Map(map).set(key, value);

/**
 * A platform for tests and local runs, scripted per channel: each call takes
 * the next behaviour scripted for its channel, and succeeds once none is left.
 * It records every call, the posts that went live, and the most calls it
 * served at once on one channel. A resumed call answers that it cannot tell,
 * unless the channel looks posts up by key (`lookUpOnResume`): then it finds
 * the post the key made, or publishes it.
 */
export class FakePlatform extends Context.Service<
  FakePlatform,
  {
    /** Every call received, in order. */
    readonly calls: Effect.Effect<readonly FakeCall[]>;
    /** The posts that went live, in order, answered or not. */
    readonly live: Effect.Effect<readonly PublishRequest[]>;
    /** Makes resumed calls on `channelId` look the post up by its key. */
    readonly lookUpOnResume: (channelId: ChannelId) => Effect.Effect<void>;
    /** The most calls in flight at once on a single channel. */
    readonly mostInFlight: Effect.Effect<number>;
    readonly publisher: PlatformPublisher["Service"];
    /** Answers the calls hanging on `channelId`: published. */
    readonly release: (channelId: ChannelId) => Effect.Effect<void>;
    /** The calls resumed, in order. */
    readonly resumes: Effect.Effect<readonly PublishRequest[]>;
    /** Queues behaviours for the next calls on `channelId`. */
    readonly script: (
      channelId: ChannelId,
      behaviours: readonly FakeBehaviour[]
    ) => Effect.Effect<void>;
  }
>()("peal-server/publishing/infrastructure/FakePlatform") {
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
          stall: () =>
            holdUntilReleased(request.channelId).pipe(
              Effect.andThen(Effect.fail(new PlatformUnavailable()))
            ),
          succeed: () => goLive(request),
        });

      const publish = (request: PublishRequest) =>
        Effect.gen(function* answering() {
          yield* enter({ at: yield* DateTime.now, request });

          const behaviour = yield* nextBehaviour(request.channelId);

          return yield* answer(request, behaviour);
        }).pipe(Effect.ensuring(leave(request.channelId)));

      const resume = (request: PublishRequest) =>
        Effect.gen(function* resuming() {
          const current = yield* Ref.updateAndGet(state, (before) => ({
            ...before,
            resumes: [...before.resumes, request],
          }));

          if (!current.lookUps.has(request.channelId)) {
            const unknown: PublishResult = {
              _tag: "unconfirmed",
              reason: "interrupted",
            };

            return unknown;
          }

          const found = current.live.findIndex(
            (live) => live.idempotencyKey === request.idempotencyKey
          );

          if (found === -1) {
            return yield* publish(request);
          }

          const published: PublishResult = {
            _tag: "published",
            platformPostId: PlatformPostIdSchema.make(`fake-${found + 1}`),
          };

          return published;
        });

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
        lookUpOnResume: (channelId) =>
          Ref.update(state, (current) => ({
            ...current,
            lookUps: new Set(current.lookUps).add(channelId),
          })),
        mostInFlight: Ref.get(state).pipe(
          Effect.map(({ mostInFlight }) => mostInFlight)
        ),
        publisher: PlatformPublisher.of({ publish, resume }),
        release,
        resumes: Ref.get(state).pipe(Effect.map(({ resumes }) => resumes)),
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
