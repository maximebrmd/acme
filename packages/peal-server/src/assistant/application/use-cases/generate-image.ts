import { DateTime, Effect, Option } from "effect";

import { AssistantQuotaExceeded } from "#assistant/application/assistant-quota-exceeded.ts";
import { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import type { ImageFailed } from "#assistant/application/image-failed.ts";
import { ImagesBusy } from "#assistant/application/images-busy.ts";
import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { AssistantUsage } from "#assistant/application/ports/assistant-usage.ts";
import { GeneratedImages } from "#assistant/application/ports/generated-images.ts";
import { ImageModel } from "#assistant/application/ports/image-model.ts";
import { ImageSlots } from "#assistant/application/ports/image-slots.ts";
import type { ImageAspect } from "#assistant/domain/image-aspect.ts";
import { imageRequestCost } from "#assistant/domain/image-limits.ts";
import { checkImagePrompt } from "#assistant/domain/image-prompt.ts";
import { usageWindowAt } from "#assistant/domain/usage-window.ts";
import type { Actor } from "#shared/domain/access.ts";

/** What image to make, for the actor's workspace. */
export interface ImageGenerationRequest {
  readonly actor: Actor;
  readonly aspect: ImageAspect;
  /** What the image should show, as the person described it. */
  readonly prompt: string;
}

/**
 * Makes an image with the image model and keeps it in the workspace's
 * media library. In order, before anything is spent: the image model must
 * be on, the prompt one the assistant takes, the workspace's storage must
 * have room for the largest image, one of the images made at once must be
 * free, and the workspace must have `imageRequestCost` requests left
 * today, which are counted then. The cost is given back only when the
 * provider never ran the request (`unreachable`). Nothing of the prompt or
 * the image is logged.
 */
export const generateImage = Effect.fn("WritingAssistant.generateImage")(
  function* generateImage({ actor, aspect, prompt }: ImageGenerationRequest) {
    const { workspaceId } = actor;
    const model = yield* ImageModel;

    if (!model.available) {
      return yield* new AssistantUnavailable();
    }

    const checked = yield* Effect.fromResult(checkImagePrompt(prompt));
    const images = yield* GeneratedImages;

    yield* images.roomFor(actor);

    // One of the images the workspace and the server make at once, for as
    // long as this one takes.
    if (!(yield* ImageSlots.use((slots) => slots.take(workspaceId)))) {
      return yield* new ImagesBusy();
    }

    const usage = yield* AssistantUsage;
    const window = usageWindowAt(yield* DateTime.now);

    const dailyLimit = yield* AssistantAllowance.use((allowance) =>
      allowance.dailyRequests(workspaceId)
    );

    const claimed = yield* usage.claim(
      workspaceId,
      window.day,
      dailyLimit,
      imageRequestCost
    );

    if (Option.isNone(claimed)) {
      return yield* new AssistantQuotaExceeded({
        dailyLimit,
        resetsAt: window.resetsAt,
      });
    }

    const giveBackUnsent = (failure: AssistantUnavailable | ImageFailed) =>
      failure._tag === "ImageFailed" && failure.reason === "unreachable"
        ? usage.release(workspaceId, window.day, imageRequestCost)
        : Effect.void;

    const made = yield* model
      .generate({ aspect, prompt: checked })
      .pipe(Effect.tapError(giveBackUnsent));

    return yield* images.store(actor, made.bytes);
  },
  // The slot goes back when the request ends, however it ends.
  Effect.scoped
);
