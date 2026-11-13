import { Context, Effect, Layer } from "effect";
import type { Option } from "effect";

import type { AssistantQuotaExceeded } from "#assistant/application/assistant-quota-exceeded.ts";
import type { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import type { ImageFailed } from "#assistant/application/image-failed.ts";
import type { ImageNotStored } from "#assistant/application/image-not-stored.ts";
import type { ImageProviderKeyRequired } from "#assistant/application/image-provider-key-required.ts";
import type { ImageProviderRefused } from "#assistant/application/image-provider-refused.ts";
import type { ImagesBusy } from "#assistant/application/images-busy.ts";
import type { OwnImagesExhausted } from "#assistant/application/own-images-exhausted.ts";
import type { OwnTextExhausted } from "#assistant/application/own-text-exhausted.ts";
import type { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import type { AssistantUsage } from "#assistant/application/ports/assistant-usage.ts";
import type {
  GeneratedImage,
  GeneratedImages,
} from "#assistant/application/ports/generated-images.ts";
import type { ImageModel } from "#assistant/application/ports/image-model.ts";
import type { ImageProviders } from "#assistant/application/ports/image-providers.ts";
import type { ImageSlots } from "#assistant/application/ports/image-slots.ts";
import type { OwnImageCounts } from "#assistant/application/ports/own-image-counts.ts";
import type { OwnImageModel } from "#assistant/application/ports/own-image-model.ts";
import type { OwnTextCounts } from "#assistant/application/ports/own-text-counts.ts";
import type { OwnWritingModel } from "#assistant/application/ports/own-writing-model.ts";
import type { PlatformLimits } from "#assistant/application/ports/platform-limits.ts";
import type { ProviderAddressCheck } from "#assistant/application/ports/provider-address-check.ts";
import type { TextProviders } from "#assistant/application/ports/text-providers.ts";
import type { WritingModel } from "#assistant/application/ports/writing-model.ts";
import type { ProviderAddressNotPublic } from "#assistant/application/provider-address-not-public.ts";
import type { ProviderSecretsNotConfigured } from "#assistant/application/provider-secrets-not-configured.ts";
import type { TextProviderKeyRequired } from "#assistant/application/text-provider-key-required.ts";
import type { TextProviderNotSet } from "#assistant/application/text-provider-not-set.ts";
import type { TextProviderRefused } from "#assistant/application/text-provider-refused.ts";
import { assistantStatus } from "#assistant/application/use-cases/assistant-status.ts";
import type { AssistantStatus } from "#assistant/application/use-cases/assistant-status.ts";
import { generateImage } from "#assistant/application/use-cases/generate-image.ts";
import type { ImageGenerationRequest } from "#assistant/application/use-cases/generate-image.ts";
import {
  removeImageProvider,
  saveImageProvider,
  viewImageProvider,
} from "#assistant/application/use-cases/image-provider-settings.ts";
import type {
  ImageProviderChange,
  ImageProviderView,
} from "#assistant/application/use-cases/image-provider-settings.ts";
import { suggest } from "#assistant/application/use-cases/suggest.ts";
import type { SuggestionRequest } from "#assistant/application/use-cases/suggest.ts";
import {
  removeTextProvider,
  saveTextProvider,
  testTextProvider,
  viewTextProvider,
} from "#assistant/application/use-cases/text-provider-settings.ts";
import type {
  TextProviderChange,
  TextProviderView,
} from "#assistant/application/use-cases/text-provider-settings.ts";
import type { WritingFailed } from "#assistant/application/writing-failed.ts";
import type { AnswerRejected } from "#assistant/domain/answer-rejected.ts";
import type { DraftRejected } from "#assistant/domain/draft-rejected.ts";
import type { ProviderAddressRejected } from "#assistant/domain/provider-address-rejected.ts";
import type { ProviderSettingRejected } from "#assistant/domain/provider-setting-rejected.ts";
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
  | ImageProviders
  | ImageSlots
  | OwnImageCounts
  | OwnImageModel
  | OwnTextCounts
  | OwnWritingModel
  | PlatformLimits
  | ProviderAddressCheck
  | TextProviders
  | WritingModel;

/** What to do with which text, in the actor's workspace. */
export type AssistantRequest = Omit<SuggestionRequest, "actor">;

/** What image to make, in the actor's workspace. */
export type ImageAsked = Omit<ImageGenerationRequest, "actor">;

export type GenerateImageFailure =
  | AssistantQuotaExceeded
  | AssistantUnavailable
  | DraftRejected
  | ImageFailed
  | ImageNotStored
  | ImageProviderRefused
  | ImagesBusy
  | MissingPermission
  | OwnImagesExhausted
  | PlanLimitReached;

export type SaveImageProviderFailure =
  | ImageProviderKeyRequired
  | MissingPermission
  | ProviderAddressNotPublic
  | ProviderAddressRejected
  | ProviderSecretsNotConfigured
  | ProviderSettingRejected;

export type SaveTextProviderFailure =
  | MissingPermission
  | ProviderAddressNotPublic
  | ProviderAddressRejected
  | ProviderSecretsNotConfigured
  | ProviderSettingRejected
  | TextProviderKeyRequired;

export type SuggestFailure =
  | AnswerRejected
  | AssistantQuotaExceeded
  | AssistantUnavailable
  | DraftRejected
  | MissingPermission
  | OwnTextExhausted
  | TextProviderRefused
  | WritingFailed;

export type TestTextProviderFailure =
  | AnswerRejected
  | MissingPermission
  | OwnTextExhausted
  | TextProviderNotSet
  | TextProviderRefused
  | WritingFailed;

/**
 * The writing assistant's use cases, for someone acting in a workspace:
 * each checks that the actor holds `assistant:use` (and `media:upload` to
 * make an image, which lands in the media library), or `assistant:configure`
 * for the image and text providers the workspace brings, then works for
 * the actor's workspace only. What API handlers call.
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
    /** The image provider the workspace brought, if any; never its key. */
    readonly imageProvider: (
      actor: Actor
    ) => Effect.Effect<Option.Option<ImageProviderView>, MissingPermission>;
    readonly saveImageProvider: (
      actor: Actor,
      change: ImageProviderChange
    ) => Effect.Effect<ImageProviderView, SaveImageProviderFailure>;
    readonly removeImageProvider: (
      actor: Actor
    ) => Effect.Effect<void, MissingPermission>;
    /** The text provider the workspace brought, if any; never its key. */
    readonly textProvider: (
      actor: Actor
    ) => Effect.Effect<Option.Option<TextProviderView>, MissingPermission>;
    readonly saveTextProvider: (
      actor: Actor,
      change: TextProviderChange
    ) => Effect.Effect<TextProviderView, SaveTextProviderFailure>;
    readonly removeTextProvider: (
      actor: Actor
    ) => Effect.Effect<void, MissingPermission>;
    /** Sends the workspace's text provider one short request, to tell whether it works. */
    readonly testTextProvider: (
      actor: Actor
    ) => Effect.Effect<void, TestTextProviderFailure>;
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

      // The workspace's own providers: `assistant:configure` (owners,
      // admins, Peal's command line, and the keys given it), not
      // `assistant:use`.
      const configuring = <A, E>(
        actor: Actor,
        useCase: Effect.Effect<A, E, AssistantPorts>
      ): Effect.Effect<A, E | MissingPermission> =>
        Effect.fromResult(authorize(actor, "assistant:configure")).pipe(
          Effect.andThen(useCase),
          Effect.provideContext(ports)
        );

      return WritingAssistant.of({
        generateImage: (actor, request) =>
          Effect.fromResult(authorize(actor, "media:upload")).pipe(
            Effect.andThen(allowed(actor, generateImage({ ...request, actor })))
          ),
        imageProvider: (actor) => configuring(actor, viewImageProvider(actor)),
        removeImageProvider: (actor) =>
          configuring(actor, removeImageProvider(actor)),
        removeTextProvider: (actor) =>
          configuring(actor, removeTextProvider(actor)),
        saveImageProvider: (actor, change) =>
          configuring(actor, saveImageProvider(actor, change)),
        saveTextProvider: (actor, change) =>
          configuring(actor, saveTextProvider(actor, change)),
        status: (actor) => allowed(actor, assistantStatus(actor.workspaceId)),
        suggest: (actor, request) =>
          allowed(actor, suggest({ ...request, actor })),
        testTextProvider: (actor) =>
          configuring(actor, testTextProvider(actor)),
        textProvider: (actor) => configuring(actor, viewTextProvider(actor)),
      });
    })
  );
}
