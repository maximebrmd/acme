import {
  Context,
  Deferred,
  Effect,
  Layer,
  Match,
  Queue,
  Redacted,
  Ref,
} from "effect";

import { ImageFailed } from "#assistant/application/image-failed.ts";
import { ImageProviderRefused } from "#assistant/application/image-provider-refused.ts";
import type {
  ImageRequest,
  MadeImage,
} from "#assistant/application/ports/image-model.ts";
import { OwnImageModel } from "#assistant/application/ports/own-image-model.ts";
import type { OwnImageEndpoint } from "#assistant/application/ports/own-image-model.ts";

/**
 * What a workspace's fake provider answers next: an image's bytes, a
 * failure, a refusal of the workspace's settings, nothing at all, or what
 * the test releases later (`held`).
 */
export type OwnImageReply =
  | { readonly _tag: "image"; readonly bytes: Uint8Array }
  | { readonly _tag: "failure"; readonly reason: ImageFailed["reason"] }
  | { readonly _tag: "held" }
  | { readonly _tag: "settingsRefused"; readonly status: number }
  | { readonly _tag: "silence" };

type ReleasedReply = Exclude<OwnImageReply, { readonly _tag: "held" }>;

/** What the fake was sent: the endpoint, its key read out, and the request. */
export interface OwnImageCall {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly request: ImageRequest;
}

/**
 * A workspace's image provider that answers what the test scripted, and
 * records every call, with the key it was given.
 */
export class FakeOwnImageModel extends Context.Service<
  FakeOwnImageModel,
  {
    readonly replyWith: (reply: OwnImageReply) => Effect.Effect<void>;
    readonly calls: Effect.Effect<readonly OwnImageCall[]>;
    /** Waits until `count` more calls have reached the provider. */
    readonly arrived: (count: number) => Effect.Effect<void>;
    /** Answers every held call, and those held from now on, `reply`. */
    readonly release: (reply: ReleasedReply) => Effect.Effect<void>;
  }
>()("peal-server/test/assistant/FakeOwnImageModel") {}

const madeFrom = (
  reply: OwnImageReply,
  released: Deferred.Deferred<ReleasedReply>
): Effect.Effect<MadeImage, ImageFailed | ImageProviderRefused> =>
  Match.valueTags(reply, {
    failure: ({ reason }) => Effect.fail(new ImageFailed({ reason })),
    held: () =>
      Deferred.await(released).pipe(
        Effect.flatMap((answer) => madeFrom(answer, released))
      ),
    image: ({ bytes }) => Effect.succeed({ bytes }),
    settingsRefused: ({ status }) =>
      Effect.fail(
        new ImageProviderRefused({ reason: "settingsRefused", status })
      ),
    silence: () => Effect.never,
  });

const callOf = (
  { apiKey, baseUrl, model }: OwnImageEndpoint,
  request: ImageRequest
): OwnImageCall => ({
  // The fake reads the key out to show which one it was sent.
  apiKey: Redacted.value(apiKey),
  baseUrl,
  model,
  request,
});

/** The fake, as OwnImageModel, and its script as FakeOwnImageModel. */
export const FakeOwnImageModelLive = Layer.effectContext(
  Effect.gen(function* FakeOwnImageModelLive() {
    const next = yield* Ref.make<OwnImageReply>({ _tag: "silence" });
    const sent = yield* Ref.make<readonly OwnImageCall[]>([]);
    const arrivals = yield* Queue.unbounded<OwnImageCall>();
    const released = yield* Deferred.make<ReleasedReply>();

    return Context.make(
      OwnImageModel,
      OwnImageModel.of({
        generate: (endpoint, request) => {
          const call = callOf(endpoint, request);

          return Ref.update(sent, (calls) => [...calls, call]).pipe(
            Effect.andThen(Queue.offer(arrivals, call)),
            Effect.andThen(Ref.get(next)),
            Effect.flatMap((reply) => madeFrom(reply, released))
          );
        },
      })
    ).pipe(
      Context.add(
        FakeOwnImageModel,
        FakeOwnImageModel.of({
          arrived: (count) =>
            Effect.all(
              Array.from({ length: count }, () => Queue.take(arrivals)),
              { discard: true }
            ),
          calls: Ref.get(sent),
          release: (reply) =>
            Deferred.succeed(released, reply).pipe(Effect.asVoid),
          replyWith: (reply) => Ref.set(next, reply),
        })
      )
    );
  })
);
