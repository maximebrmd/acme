import { Context, Effect, Layer } from "effect";

import type { AssistantQuotaExceeded } from "#assistant/application/assistant-quota-exceeded.ts";
import type { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import type { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import type { AssistantUsage } from "#assistant/application/ports/assistant-usage.ts";
import type { PlatformLimits } from "#assistant/application/ports/platform-limits.ts";
import type { WritingModel } from "#assistant/application/ports/writing-model.ts";
import { assistantStatus } from "#assistant/application/use-cases/assistant-status.ts";
import type { AssistantStatus } from "#assistant/application/use-cases/assistant-status.ts";
import { suggest } from "#assistant/application/use-cases/suggest.ts";
import type { SuggestionRequest } from "#assistant/application/use-cases/suggest.ts";
import type { WritingFailed } from "#assistant/application/writing-failed.ts";
import type { AnswerRejected } from "#assistant/domain/answer-rejected.ts";
import type { DraftRejected } from "#assistant/domain/draft-rejected.ts";
import type { Suggestion } from "#assistant/domain/suggestion.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

type AssistantPorts =
  | AssistantAllowance
  | AssistantUsage
  | PlatformLimits
  | WritingModel;

/** What to do with which text, in the actor's workspace. */
export type AssistantRequest = Omit<SuggestionRequest, "workspaceId">;

export type SuggestFailure =
  | AnswerRejected
  | AssistantQuotaExceeded
  | AssistantUnavailable
  | DraftRejected
  | MissingPermission
  | WritingFailed;

/**
 * The writing assistant's use cases, for someone acting in a workspace:
 * each checks that the actor holds `assistant:use`, then works for the
 * actor's workspace only. What API handlers call.
 */
export class WritingAssistant extends Context.Service<
  WritingAssistant,
  {
    readonly status: (
      actor: Actor
    ) => Effect.Effect<AssistantStatus, MissingPermission>;
    readonly suggest: (
      actor: Actor,
      request: AssistantRequest
    ) => Effect.Effect<Suggestion, SuggestFailure>;
  }
>()("acme-server/assistant/application/WritingAssistant") {
  /** The use cases, running on the ports the layer is given. */
  static readonly layer = Layer.effect(
    WritingAssistant,
    Effect.gen(function* WritingAssistantLive() {
      const ports = yield* Effect.context<AssistantPorts>();

      const allowed = <A, E>(
        actor: Actor,
        useCase: Effect.Effect<A, E, AssistantPorts>
      ): Effect.Effect<A, E | MissingPermission> =>
        Effect.fromResult(authorize(actor, "assistant:use")).pipe(
          Effect.andThen(useCase),
          Effect.provideContext(ports)
        );

      return WritingAssistant.of({
        status: (actor) => allowed(actor, assistantStatus(actor.workspaceId)),
        suggest: (actor, request) =>
          allowed(
            actor,
            suggest({ ...request, workspaceId: actor.workspaceId })
          ),
      });
    })
  );
}
