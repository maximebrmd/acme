import { Context, Effect, Layer, Match, Ref } from "effect";

import { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import { ImageFailed } from "#assistant/application/image-failed.ts";
import { ImageModel } from "#assistant/application/ports/image-model.ts";
import type {
  ImageRequest,
  MadeImage,
} from "#assistant/application/ports/image-model.ts";

/**
 * What the fake image model answers next: an image's bytes, a failure, a
 * refusal of the server's key, or nothing at all.
 */
export type ImageReply =
  | { readonly _tag: "image"; readonly bytes: Uint8Array }
  | { readonly _tag: "failure"; readonly reason: ImageFailed["reason"] }
  | { readonly _tag: "keyRefused" }
  | { readonly _tag: "silence" };

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
  }
>()("peal-server/test/assistant/FakeImageModel") {}

const madeFrom = (
  reply: ImageReply
): Effect.Effect<MadeImage, AssistantUnavailable | ImageFailed> =>
  Match.valueTags(reply, {
    failure: ({ reason }) => Effect.fail(new ImageFailed({ reason })),
    image: ({ bytes }) => Effect.succeed({ bytes }),
    keyRefused: () => Effect.fail(new AssistantUnavailable()),
    silence: () => Effect.never,
  });

/** The fake image model, as ImageModel, and its script as FakeImageModel. */
export const FakeImageModelLive = Layer.effectContext(
  Effect.gen(function* FakeImageModelLive() {
    const next = yield* Ref.make<ImageReply>({ _tag: "silence" });
    const sent = yield* Ref.make<readonly ImageRequest[]>([]);

    return Context.make(
      ImageModel,
      ImageModel.of({
        available: true,
        generate: (request) =>
          Ref.update(sent, (requests) => [...requests, request]).pipe(
            Effect.andThen(Ref.get(next)),
            Effect.flatMap(madeFrom)
          ),
      })
    ).pipe(
      Context.add(
        FakeImageModel,
        FakeImageModel.of({
          replyWith: (reply) => Ref.set(next, reply),
          requests: Ref.get(sent),
        })
      )
    );
  })
);
