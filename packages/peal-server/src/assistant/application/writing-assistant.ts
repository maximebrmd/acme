import { Context, Effect, Layer } from "effect";

import type { AssistantQuotaExceeded } from "#assistant/application/assistant-quota-exceeded.ts";
import type { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import type { ImageFailed } from "#assistant/application/image-failed.ts";
import type { ImageNotStored } from "#assistant/application/image-not-stored.ts";
import type { ImagesBusy } from "#assistant/application/images-busy.ts";
import type { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import type { AssistantUsage } from "#assistant/application/ports/assistant-usage.ts";
import type {
  GeneratedImage,
  GeneratedImages,
} from "#assistant/application/ports/generated-images.ts";
import type { ImageModel } from "#assistant/application/ports/image-model.ts";
import type { ImageSlots } from "#assistant/application/ports/image-slots.ts";
import type { PlatformLimits } from "#assistant/application/ports/platform-limits.ts";
import type { WritingModel } from "#assistant/application/ports/writing-model.ts";
import { assistantStatus } from "#assistant/application/use-cases/assistant-status.ts";
import type { AssistantStatus } from "#assistant/application/use-cases/assistant-status.ts";
import { generateImage } from "#assistant/application/use-cases/generate-image.ts";
import type { ImageGenerationRequest } from "#assistant/application/use-cases/generate-image.ts";
import { suggest } from "#assistant/application/use-cases/suggest.ts";
import type { SuggestionRequest } from "#assistant/application/use-cases/suggest.ts";
import type { WritingFailed } from "#assistant/application/writing-failed.ts";
import type { AnswerRejected } from "#assistant/domain/answer-rejected.ts";
import type { DraftRejected } from "#assistant/domain/draft-rejected.ts";
import type { Suggestion } from "#assistant/domain/suggestion.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

type AssistantPorts =
  | AssistantAllowance
  | AssistantUsage
  | GeneratedImages
  | ImageModel
  | ImageSlots
  | PlatformLimits
  | WritingModel;

/** What to do with which text, in the actor's workspace. */
export type AssistantRequest = Omit<SuggestionRequest, "workspaceId">;

/** What image to make, in the actor's workspace. */
export type ImageAsked = Omit<ImageGenerationRequest, "actor">;

export type GenerateImageFailure =
  | AssistantQuotaExceeded
  | AssistantUnavailable
  | DraftRejected
  | ImageFailed
  | ImageNotStored
  | ImagesBusy
  | MissingPermission
  | PlanLimitReached;

export type SuggestFailure =
  | AnswerRejected
  | AssistantQuotaExceeded
  | AssistantUnavailable
  | DraftRejected
  | MissingPermission
  | WritingFailed;

/**
 * The writing assistant's use cases, for someone acting in a workspace:
 * each checks that the actor holds `assistant:use` (and `media:upload` to
 * make an image, which lands in the media library), then works for the
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
    readonly generateImage: (
      actor: Actor,
      request: ImageAsked
    ) => Effect.Effect<GeneratedImage, GenerateImageFailure>;
  }
>()("peal-server/assistant/application/WritingAssistant") {
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
        generateImage: (actor, request) =>
          Effect.fromResult(authorize(actor, "media:upload")).pipe(
            Effect.andThen(allowed(actor, generateImage({ ...request, actor })))
          ),
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
