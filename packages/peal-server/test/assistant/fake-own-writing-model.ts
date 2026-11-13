import { Context, Effect, Layer, Match, Redacted, Ref, Schema } from "effect";

import { OwnWritingModel } from "#assistant/application/ports/own-writing-model.ts";
import type { OwnTextEndpoint } from "#assistant/application/ports/own-writing-model.ts";
import { TextProviderRefused } from "#assistant/application/text-provider-refused.ts";
import { WritingFailed } from "#assistant/application/writing-failed.ts";
import type { WritingPrompt } from "#assistant/domain/writing-prompt.ts";

/**
 * What a workspace's fake text provider answers next: a JSON document, a
 * failure, a refusal of the workspace's settings, or nothing at all.
 */
export type OwnTextReply =
  | { readonly _tag: "answer"; readonly value: typeof Schema.Json.Type }
  | { readonly _tag: "failure"; readonly reason: WritingFailed["reason"] }
  | { readonly _tag: "settingsRefused"; readonly status: number }
  | { readonly _tag: "silence" };

/** What the fake was sent: the endpoint, its key read out, and the prompt. */
export interface OwnTextCall {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly kind: string;
  readonly model: string;
  readonly prompt: WritingPrompt;
}

/**
 * A workspace's text provider that answers what the test scripted, and
 * records every call, with the key it was given.
 */
export class FakeOwnWritingModel extends Context.Service<
  FakeOwnWritingModel,
  {
    readonly replyWith: (reply: OwnTextReply) => Effect.Effect<void>;
    readonly calls: Effect.Effect<readonly OwnTextCall[]>;
  }
>()("peal-server/test/assistant/FakeOwnWritingModel") {}

const callOf = (
  { apiKey, baseUrl, kind, model }: OwnTextEndpoint,
  prompt: WritingPrompt
): OwnTextCall => ({
  // The fake reads the key out to show which one it was sent.
  apiKey: Redacted.value(apiKey),
  baseUrl,
  kind,
  model,
  prompt,
});

/** The fake, as OwnWritingModel, and its script as FakeOwnWritingModel. */
export const FakeOwnWritingModelLive = Layer.effectContext(
  Effect.gen(function* FakeOwnWritingModelLive() {
    const next = yield* Ref.make<OwnTextReply>({
      _tag: "answer",
      value: { text: "A suggestion of the workspace's own." },
    });

    const sent = yield* Ref.make<readonly OwnTextCall[]>([]);

    const write = <A, I extends Readonly<Record<string, unknown>>>(
      endpoint: OwnTextEndpoint,
      prompt: WritingPrompt,
      answer: Schema.Codec<A, I>
    ): Effect.Effect<A, TextProviderRefused | WritingFailed> =>
      Ref.update(sent, (calls) => [...calls, callOf(endpoint, prompt)]).pipe(
        Effect.andThen(Ref.get(next)),
        Effect.flatMap((reply) =>
          Match.valueTags(reply, {
            answer: ({ value }) =>
              Schema.decodeUnknownEffect(answer)(value).pipe(
                Effect.mapError(
                  () => new WritingFailed({ reason: "invalidAnswer" })
                )
              ),
            failure: ({ reason }) => Effect.fail(new WritingFailed({ reason })),
            settingsRefused: ({ status }) =>
              Effect.fail(
                new TextProviderRefused({ reason: "settingsRefused", status })
              ),
            silence: () => Effect.never,
          })
        )
      );

    return Context.make(OwnWritingModel, OwnWritingModel.of({ write })).pipe(
      Context.add(
        FakeOwnWritingModel,
        FakeOwnWritingModel.of({
          calls: Ref.get(sent),
          replyWith: (reply) => Ref.set(next, reply),
        })
      )
    );
  })
);
