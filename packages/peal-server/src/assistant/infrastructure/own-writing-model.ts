import { Duration, Effect, Layer, Match, Option } from "effect";
import type { Schema } from "effect";
import { LanguageModel } from "effect/ai";
import type { AiError } from "effect/ai";
import { FetchHttpClient, HttpClient } from "effect/http";

import { OwnWritingModel } from "#assistant/application/ports/own-writing-model.ts";
import type { OwnTextEndpoint } from "#assistant/application/ports/own-writing-model.ts";
import { TextProviderRefused } from "#assistant/application/text-provider-refused.ts";
import { WritingFailed } from "#assistant/application/writing-failed.ts";
import type { WritingPrompt } from "#assistant/domain/writing-prompt.ts";
import {
  answerTimeout,
  generateAnswer,
  reasonOf,
} from "#assistant/infrastructure/language-model-writing-model.ts";
import { languageModelOf } from "#assistant/infrastructure/writing-model-live.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { publicLibraryHttpClientWith } from "#shared/infrastructure/platforms/public-http.ts";

// What every log line and span of a workspace's provider says of it: whose
// it is, never its host or its model, which are the workspace's business.
const source = { "peal.assistant.text_source": "workspace" } as const;

/**
 * The most an answer may carry: 4,096 tokens of JSON, with room, far less
 * than the public client's megabyte, so a slow endpoint holds little
 * memory.
 */
export const maxAnswerBytes = 256 * 1024;

// The statuses that say the workspace's settings are wrong: its key, its
// account, its model or its address.
const settingsRefused: ReadonlySet<number> = new Set([401, 402, 403, 404]);

const failWith = (kind: string, reason: WritingFailed["reason"]) =>
  Effect.logWarning("A workspace's text provider failed", {
    kind,
    reason,
    source: "workspace",
  }).pipe(
    Effect.andThen(Effect.annotateCurrentSpan("peal.assistant.failure", kind)),
    Effect.andThen(Effect.fail(new WritingFailed({ reason })))
  );

const refusedWith = (
  kind: string,
  reason: TextProviderRefused["reason"],
  status: number | null
) =>
  Effect.logWarning("A workspace's text provider refused its settings", {
    kind,
    source: "workspace",
    status,
  }).pipe(
    Effect.andThen(Effect.annotateCurrentSpan("peal.assistant.failure", kind)),
    Effect.andThen(Effect.fail(new TextProviderRefused({ reason, status })))
  );

// The provider's status, when the failure came with an answer.
const statusOf = ({ reason }: AiError.AiError): number | null =>
  "http" in reason ? (reason.http?.response?.status ?? null) : null;

// A failure of the provider's: the settings it refused, a redirect it
// answered with, or anything else, as the server's model tells it.
const failed = (
  error: AiError.AiError
): Effect.Effect<never, TextProviderRefused | WritingFailed> => {
  const status = statusOf(error);

  if (status !== null && settingsRefused.has(status)) {
    return refusedWith(`Status${status}`, "settingsRefused", status);
  }

  if (status !== null && status >= 300 && status <= 399) {
    return refusedWith(`Status${status}`, "redirected", status);
  }

  return failWith(error.reason._tag, reasonOf(error));
};

// A host Peal sends nothing to is the workspace's to fix; one that cannot
// be looked up for now may answer later.
const guardRefused = ({
  reason,
}: OutboundRequestRefused): Effect.Effect<
  never,
  TextProviderRefused | WritingFailed
> =>
  reason === "lookupFailed"
    ? failWith("Lookup", "unreachable")
    : refusedWith("AddressRefused", "addressRefused", null);

// The provider's settings as the server's own adapters take them.
const providerOf = (endpoint: OwnTextEndpoint) =>
  Match.value(endpoint.kind).pipe(
    Match.when("anthropic", () => ({
      _tag: "Anthropic" as const,
      apiKey: endpoint.apiKey,
      baseUrl: Option.some<string>(endpoint.baseUrl),
      model: endpoint.model,
    })),
    Match.when("openai-compatible", () => ({
      _tag: "OpenAiCompatible" as const,
      apiKey: Option.some(endpoint.apiKey),
      baseUrl: endpoint.baseUrl,
      model: endpoint.model,
    })),
    Match.exhaustive
  );

/**
 * OwnWritingModel on the server's own adapters (`@effect/ai-anthropic`,
 * `@effect/ai-openai-compat`), at the address a workspace's member typed:
 * the address is checked by the outbound guard before the call, and the
 * call goes through the public HTTP client, which checks it again on every
 * request (HTTPS on the default port, every address public), follows no
 * redirect, cuts the answer off past a megabyte and sends no trace
 * context.
 *
 * 401, 402, 403 and 404 are the workspace's settings refused
 * (TextProviderRefused, with the status), a 3xx is `redirected`, and a
 * host the guard refuses is `addressRefused` (with none), but for a name
 * that cannot be looked up for now, which is `unreachable`; the rest is
 * WritingFailed, as for the server's model. It keeps no state. The key is
 * `Redacted` until the request's header; the logs and the span say
 * `workspace`, the API it speaks, the status and the kind of failure,
 * never the host, the model, the draft or the answer.
 */
export const ownWritingModel = ({
  timeout = answerTimeout,
}: { readonly timeout?: Duration.Input } = {}) =>
  Layer.effect(
    OwnWritingModel,
    Effect.gen(function* makeOwnWritingModel() {
      const guard = yield* OutboundGuard;

      // The whole call waits `timeout`: the client's own bound is a little
      // later, so a slow provider ends as `timedOut`. A request the guard
      // refuses there (a name that changed its answer since the check) is
      // one that could not be sent: `unreachable`.
      const client = yield* publicLibraryHttpClientWith({
        maxResponseBytes: maxAnswerBytes,
        timeout: Duration.sum(
          Duration.fromInputUnsafe(timeout),
          Duration.seconds(1)
        ),
      });

      const http = Layer.succeed(HttpClient.HttpClient, client);

      const write = <A, I extends Readonly<Record<string, unknown>>>(
        endpoint: OwnTextEndpoint,
        prompt: WritingPrompt,
        answer: Schema.Codec<A, I>
      ) =>
        guard.check(new URL(endpoint.baseUrl)).pipe(
          // The guard's span names the host it refuses.
          Effect.withTracerEnabled(false),
          Effect.catchTag("OutboundRequestRefused", guardRefused),
          Effect.andThen(
            LanguageModel.LanguageModel.use((model) =>
              generateAnswer(model, prompt, answer)
            ).pipe(
              Effect.provide(
                languageModelOf(providerOf(endpoint)).pipe(Layer.provide(http))
              )
            )
          ),
          Effect.catchTag("AiError", failed),
          // Interrupting the call aborts its HTTP request.
          Effect.timeoutOrElse({
            duration: timeout,
            orElse: () => failWith("Timeout", "timedOut"),
          }),
          Effect.withSpan("OwnWritingModel.write", {
            attributes: {
              "gen_ai.provider.name": endpoint.kind,
              ...source,
            },
          })
        );

      return OwnWritingModel.of({ write });
    })
  );

/**
 * OwnWritingModel as the server runs it: the guard resolves names with the
 * runtime's Dns, which the composition root provides.
 */
export const OwnWritingModelLive = ownWritingModel().pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(FetchHttpClient.layer)
);
