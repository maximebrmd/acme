import { DateTime, Effect } from "effect";

import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { AssistantUsage } from "#assistant/application/ports/assistant-usage.ts";
import { ImageModel } from "#assistant/application/ports/image-model.ts";
import { WritingModel } from "#assistant/application/ports/writing-model.ts";
import { maxDraftLength } from "#assistant/domain/draft.ts";
import { ImageAspectSchema } from "#assistant/domain/image-aspect.ts";
import type { ImageAspect } from "#assistant/domain/image-aspect.ts";
import { imageRequestCost } from "#assistant/domain/image-limits.ts";
import { maxImagePromptLength } from "#assistant/domain/image-prompt.ts";
import { remainingOf, usageWindowAt } from "#assistant/domain/usage-window.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** Whether the assistant makes images, and on what terms. */
export interface ImagesStatus {
  /** The aspects an image can be made in. */
  readonly aspects: readonly ImageAspect[];
  /** Whether the server has an image model; clients hide images otherwise. */
  readonly available: boolean;
  /** The longest description an image is made from. */
  readonly maxPromptLength: number;
  /** How many of the day's requests an image costs. */
  readonly requestCost: number;
}

/** Whether the assistant is on, and what is left of the workspace's day. */
export interface AssistantStatus {
  /** Whether the server has a language model; clients hide the assistant otherwise. */
  readonly available: boolean;
  readonly dailyLimit: number;
  readonly images: ImagesStatus;
  /** The longest text the assistant takes. */
  readonly maxTextLength: number;
  readonly remaining: number;
  readonly resetsAt: DateTime.Utc;
}

/** Whether the workspace can ask the assistant, and how often today. */
export const assistantStatus = Effect.fn("WritingAssistant.status")(
  function* assistantStatus(workspaceId: WorkspaceId) {
    const { available } = yield* WritingModel;
    const imageModel = yield* ImageModel;
    const window = usageWindowAt(yield* DateTime.now);

    const dailyLimit = yield* AssistantAllowance.use((allowance) =>
      allowance.dailyRequests(workspaceId)
    );

    const used = yield* AssistantUsage.use((usage) =>
      usage.used(workspaceId, window.day)
    );

    const status: AssistantStatus = {
      available,
      dailyLimit,
      images: {
        aspects: ImageAspectSchema.literals,
        available: imageModel.available,
        maxPromptLength: maxImagePromptLength,
        requestCost: imageRequestCost,
      },
      maxTextLength: maxDraftLength,
      remaining: remainingOf(dailyLimit, used),
      resetsAt: window.resetsAt,
    };

    return status;
  }
);
