import { DateTime, Effect, Option } from "effect";

import { AssistantQuotaExceeded } from "#assistant/application/assistant-quota-exceeded.ts";
import { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import type { ImageFailed } from "#assistant/application/image-failed.ts";
import { ImageProviderRefused } from "#assistant/application/image-provider-refused.ts";
import { ImagesBusy } from "#assistant/application/images-busy.ts";
import { OwnImagesExhausted } from "#assistant/application/own-images-exhausted.ts";
import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { AssistantUsage } from "#assistant/application/ports/assistant-usage.ts";
import { GeneratedImages } from "#assistant/application/ports/generated-images.ts";
import { ImageModel } from "#assistant/application/ports/image-model.ts";
import { ImageProviders } from "#assistant/application/ports/image-providers.ts";
import type { OpenedImageProvider } from "#assistant/application/ports/image-providers.ts";
import { ImageSlots } from "#assistant/application/ports/image-slots.ts";
import { OwnImageCounts } from "#assistant/application/ports/own-image-counts.ts";
import { OwnImageModel } from "#assistant/application/ports/own-image-model.ts";
import type { ImageAspect } from "#assistant/domain/image-aspect.ts";
import {
  imageRequestCost,
  ownImagesPerDay,
} from "#assistant/domain/image-limits.ts";
import { checkImagePrompt } from "#assistant/domain/image-prompt.ts";
import { usageWindowAt } from "#assistant/domain/usage-window.ts";
import { MeteredUsage } from "#shared/application/metered-usage.ts";
import type { Actor } from "#shared/domain/access.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";

/** What image to make, for the actor's workspace. */
export interface ImageGenerationRequest {
  readonly actor: Actor;
  readonly aspect: ImageAspect;
  /** What the image should show, as the person described it. */
  readonly prompt: string;
}

/**
 * Makes an image with the workspace's own provider and keeps it in its
 * media library: the prompt checked, room for the largest image, one of
 * the images made at once (slots of their own), and one of the
 * `ownImagesPerDay` the workspace's provider is asked for each day, which
 * counts whatever the call ends with. Nothing of Peal's daily requests is
 * read or counted, whatever the plan (a trial and the free plan included), and the
 * server's model is never asked, not even when the workspace's provider
 * fails, nor when its key no longer opens. Staff acting as a member are
 * refused: the workspace's account at its provider would pay.
 */
const ownImage = Effect.fn("WritingAssistant.generateOwnImage")(
  function* ownImage(
    { actor, aspect, prompt }: ImageGenerationRequest,
    { apiKey, settings }: OpenedImageProvider
  ) {
    // Staff acting as a member would send their prompt to the workspace's
    // provider, which its account pays: the member does it themselves.
    if (
      actor.subject._tag === "user" &&
      Option.isSome(actor.subject.impersonatedBy)
    ) {
      return yield* new MissingPermission({
        permission: "assistant:configure",
      });
    }

    const checked = yield* Effect.fromResult(checkImagePrompt(prompt));

    // A key that no longer opens is typed again; nothing is asked of
    // anyone meanwhile.
    if (Option.isNone(apiKey)) {
      return yield* new ImageProviderRefused({
        reason: "keyUnreadable",
        status: null,
      });
    }

    const images = yield* GeneratedImages;

    yield* images.roomFor(actor);

    // Slots of their own: an endpoint that never answers holds none of
    // those the server's model makes images in.
    if (
      !(yield* ImageSlots.use((slots) =>
        slots.take(actor.workspaceId, "workspace")
      ))
    ) {
      return yield* new ImagesBusy();
    }

    // Every request counts, whatever it ends with: what bounds a
    // workspace's hold on the server, since Peal's allowance does not.
    const window = usageWindowAt(yield* DateTime.now);

    const counted = yield* OwnImageCounts.use((counts) =>
      counts.claim(actor.workspaceId, window.day, ownImagesPerDay)
    );

    if (Option.isNone(counted)) {
      return yield* new OwnImagesExhausted({
        dailyLimit: ownImagesPerDay,
        resetsAt: window.resetsAt,
      });
    }

    const made = yield* OwnImageModel.use((model) =>
      model.generate(
        {
          apiKey: apiKey.value,
          baseUrl: settings.baseUrl,
          model: settings.model,
        },
        { aspect, prompt: checked }
      )
    );

    return yield* images.store(actor, made.bytes);
  }
);

/**
 * Makes an image and keeps it in the workspace's media library: with the
 * workspace's own provider when it brought one (`ownImage`), otherwise
 * with the server's image model. On the server's model, in order, before
 * anything is spent: the image model must
 * be on, the prompt one the assistant takes, the workspace's storage must
 * have room for the largest image, one of the images made at once must be
 * free, and, on a server that bills, the billing account must have an
 * image left this month (`MeteredUsage`), given back whenever none is
 * stored; elsewhere the workspace must have `imageRequestCost` requests
 * left today, which are counted then. The cost is given back whenever no image
 * came of it: the provider could not be reached, refused the request or
 * the server's settings, or the plan had no room left to keep it. A
 * timeout or an unusable answer counts, as the provider may have made the
 * image. Nothing of the prompt or the image is logged.
 */
export const generateImage = Effect.fn("WritingAssistant.generateImage")(
  function* generateImage(request: ImageGenerationRequest) {
    const { actor, aspect, prompt } = request;
    const { workspaceId } = actor;

    const own = yield* ImageProviders.use((providers) =>
      providers.open(workspaceId)
    );

    if (Option.isSome(own)) {
      return yield* ownImage(request, own.value);
    }

    const model = yield* ImageModel;

    if (!(yield* model.available)) {
      return yield* new AssistantUnavailable();
    }

    const checked = yield* Effect.fromResult(checkImagePrompt(prompt));
    const images = yield* GeneratedImages;

    yield* images.roomFor(actor);

    // One of the images the workspace and the server make at once, for as
    // long as this one takes.
    if (
      !(yield* ImageSlots.use((slots) => slots.take(workspaceId, "server")))
    ) {
      return yield* new ImagesBusy();
    }

    const allowance = yield* AssistantAllowance;

    // On a server that bills: one of the billing account's images this
    // month, claimed now (none without a payment method), and given back
    // whenever no image was stored, whatever the reason.
    if (allowance.metered) {
      const meters = yield* MeteredUsage;

      // A database failure is a defect here, as the day's count's are.
      const claim = yield* meters
        .claim(workspaceId, "assistantImages", 1)
        .pipe(Effect.catchTag("DatabaseError", Effect.die));

      return yield* model.generate({ aspect, prompt: checked }).pipe(
        Effect.flatMap((made) => images.store(actor, made.bytes)),
        Effect.onError(() => meters.giveBack(claim).pipe(Effect.orDie))
      );
    }

    const usage = yield* AssistantUsage;
    const window = usageWindowAt(yield* DateTime.now);

    // Images may take less of the day than suggestions: none on a trial.
    const dailyLimit = yield* allowance.imageRequests(workspaceId);

    const claimed = yield* usage.claim(
      workspaceId,
      window.day,
      dailyLimit,
      imageRequestCost,
      // Alone, where no day is shared: one statement.
      allowance.pooled ? allowance.sharedWith(workspaceId) : undefined
    );

    if (Option.isNone(claimed)) {
      return yield* new AssistantQuotaExceeded({
        dailyLimit,
        resetsAt: window.resetsAt,
      });
    }

    const giveBack = usage.release(workspaceId, window.day, imageRequestCost);

    // The provider made nothing: it could not be reached, refused the
    // request, or refused the server's settings.
    const giveBackUnmade = (failure: AssistantUnavailable | ImageFailed) =>
      failure._tag === "AssistantUnavailable" ||
      failure.reason === "unreachable" ||
      failure.reason === "refused"
        ? giveBack
        : Effect.void;

    const made = yield* model
      .generate({ aspect, prompt: checked })
      .pipe(Effect.tapError(giveBackUnmade));

    // An image the plan has no room for once counted under the lock is
    // not kept, so it costs nothing.
    return yield* images
      .store(actor, made.bytes)
      .pipe(
        Effect.tapError((failure) =>
          failure._tag === "PlanLimitReached" ? giveBack : Effect.void
        )
      );
  },
  // The slot goes back when the request ends, however it ends.
  Effect.scoped
);
