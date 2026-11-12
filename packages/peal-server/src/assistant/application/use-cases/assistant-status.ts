import { DateTime, Effect, Option } from "effect";

import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { AssistantUsage } from "#assistant/application/ports/assistant-usage.ts";
import { ImageModel } from "#assistant/application/ports/image-model.ts";
import { ImageProviders } from "#assistant/application/ports/image-providers.ts";
import { WritingModel } from "#assistant/application/ports/writing-model.ts";
import { maxDraftLength } from "#assistant/domain/draft.ts";
import { ImageAspectSchema } from "#assistant/domain/image-aspect.ts";
import type { ImageAspect } from "#assistant/domain/image-aspect.ts";
import { imageRequestCost } from "#assistant/domain/image-limits.ts";
import { maxImagePromptLength } from "#assistant/domain/image-prompt.ts";
import { remainingOf, usageWindowAt } from "#assistant/domain/usage-window.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * Who makes the workspace's images: the provider it brought, or the
 * server's model.
 */
export type ImageSource = "server" | "workspace";

/** Whether the assistant makes images, and on what terms. */
export interface ImagesStatus {
  /** The aspects an image can be made in. */
  readonly aspects: readonly ImageAspect[];
  /**
   * Whether images can be made: the workspace brought a provider, or the
   * server has an image model. Clients hide images otherwise.
   */
  readonly available: boolean;
  /**
   * How many of the day's requests images of the server's model may take:
   * the day's limit, but none on a trial. Under `requestCost`, the
   * workspace makes no image with it. It bounds nothing while the
   * workspace's own provider makes them.
   */
  readonly dailyLimit: number;
  /** The longest description an image is made from. */
  readonly maxPromptLength: number;
  /** How many of the day's requests an image costs: none from its own provider. */
  readonly requestCost: number;
  /** Who makes them, or null when nobody does. */
  readonly source: ImageSource | null;
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

// The server's model makes the images when the workspace has no provider.
const serverOrNone = (available: boolean): ImageSource | null =>
  available ? "server" : null;

/** Whether the workspace can ask the assistant, and how often today. */
export const assistantStatus = Effect.fn("WritingAssistant.status")(
  function* assistantStatus(workspaceId: WorkspaceId) {
    const { available } = yield* WritingModel;
    const imageModel = yield* ImageModel;

    const own = yield* ImageProviders.use((providers) =>
      providers.find(workspaceId)
    );

    const serverImages = yield* imageModel.available;

    // While the workspace has its own provider, the server's model is
    // never asked, whatever it is.
    const source: ImageSource | null = Option.isSome(own)
      ? "workspace"
      : serverOrNone(serverImages);

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
        available: source !== null,
        dailyLimit: yield* AssistantAllowance.use((allowance) =>
          allowance.imageRequests(workspaceId)
        ),
        maxPromptLength: maxImagePromptLength,
        requestCost: source === "workspace" ? 0 : imageRequestCost,
        source,
      },
      maxTextLength: maxDraftLength,
      remaining: remainingOf(dailyLimit, used),
      resetsAt: window.resetsAt,
    };

    return status;
  }
);
