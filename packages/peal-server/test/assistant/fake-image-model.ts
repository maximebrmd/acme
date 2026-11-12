import { Context, Deferred, Effect, Layer, Match, Queue, Ref } from "effect";

import { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import { ImageFailed } from "#assistant/application/image-failed.ts";
import { ImageModel } from "#assistant/application/ports/image-model.ts";
import type {
  ImageRequest,
  MadeImage,
} from "#assistant/application/ports/image-model.ts";

/**
 * What the fake image model answers next: an image's bytes, a failure, a
 * refusal of the server's key, nothing at all, or what the test releases
 * later (`held`: the request waits, without any clock, until `release`).
 */
export type ImageReply =
  | { readonly _tag: "image"; readonly bytes: Uint8Array }
  | { readonly _tag: "failure"; readonly reason: ImageFailed["reason"] }
  | { readonly _tag: "held" }
  | { readonly _tag: "keyRefused" }
  | { readonly _tag: "silence" };

/** What a held request answers once released. */
export type ReleasedReply = Exclude<ImageReply, { readonly _tag: "held" }>;

/**
 * An image model that answers what the test scripted, and records every
 * request it was sent.
 */
export class FakeImageModel extends Context.Service<
  FakeImageModel,
  {
    /** Answers `reply` from now on. */
    readonly replyWith: (reply: ImageReply) => Effect.Effect<void>;
    /** The requests the model was sent, oldest first. */
    readonly requests: Effect.Effect<readonly ImageRequest[]>;
    /**
     * Waits until `count` more requests have reached the model: what a
     * test waits on before asking again, rather than a clock or a loop.
     */
    readonly arrived: (count: number) => Effect.Effect<void>;
    /** Answers every held request, and those held from now on, `reply`. */
    readonly release: (reply: ReleasedReply) => Effect.Effect<void>;
  }
>()("peal-server/test/assistant/FakeImageModel") {}

const madeFrom = (
  reply: ImageReply,
  released: Deferred.Deferred<ReleasedReply>
): Effect.Effect<MadeImage, AssistantUnavailable | ImageFailed> =>
  Match.valueTags(reply, {
    failure: ({ reason }) => Effect.fail(new ImageFailed({ reason })),
    held: () =>
      Deferred.await(released).pipe(
        Effect.flatMap((answer) => madeFrom(answer, released))
      ),
    image: ({ bytes }) => Effect.succeed({ bytes }),
    keyRefused: () => Effect.fail(new AssistantUnavailable()),
    silence: () => Effect.never,
  });

/** The fake image model, as ImageModel, and its script as FakeImageModel. */
export const FakeImageModelLive = Layer.effectContext(
  Effect.gen(function* FakeImageModelLive() {
    const next = yield* Ref.make<ImageReply>({ _tag: "silence" });
    const sent = yield* Ref.make<readonly ImageRequest[]>([]);
    // One entry for each request that reached the model.
    const arrivals = yield* Queue.unbounded<ImageRequest>();
    const released = yield* Deferred.make<ReleasedReply>();

    return Context.make(
      ImageModel,
      ImageModel.of({
        available: Effect.succeed(true),
        generate: (request) =>
          Ref.update(sent, (requests) => [...requests, request]).pipe(
            Effect.andThen(Queue.offer(arrivals, request)),
            Effect.andThen(Ref.get(next)),
            Effect.flatMap((reply) => madeFrom(reply, released))
          ),
      })
    ).pipe(
      Context.add(
        FakeImageModel,
        FakeImageModel.of({
          arrived: (count) =>
            Effect.all(
              Array.from({ length: count }, () => Queue.take(arrivals)),
              { discard: true }
            ),
          release: (reply) =>
            Deferred.succeed(released, reply).pipe(Effect.asVoid),
          replyWith: (reply) => Ref.set(next, reply),
          requests: Ref.get(sent),
        })
      )
    );
  })
);
