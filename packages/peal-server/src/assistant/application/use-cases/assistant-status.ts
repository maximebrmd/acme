import { DateTime, Effect, Option } from "effect";

import { pooledUsed } from "#assistant/application/pooled-requests.ts";
import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { ImageModel } from "#assistant/application/ports/image-model.ts";
import { ImageProviders } from "#assistant/application/ports/image-providers.ts";
import { TextProviders } from "#assistant/application/ports/text-providers.ts";
import { WritingModel } from "#assistant/application/ports/writing-model.ts";
import { maxDraftLength } from "#assistant/domain/draft.ts";
import { ImageAspectSchema } from "#assistant/domain/image-aspect.ts";
import type { ImageAspect } from "#assistant/domain/image-aspect.ts";
import { imageRequestCost } from "#assistant/domain/image-limits.ts";
import { maxImagePromptLength } from "#assistant/domain/image-prompt.ts";
import { remainingOf, usageWindowAt } from "#assistant/domain/usage-window.ts";
import { MeteredUsage } from "#shared/application/metered-usage.ts";
import type { MeterState } from "#shared/application/metered-usage.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * Who makes the workspace's images, or writes its text: the provider it
 * brought, or the server's model.
 */
export type ImageSource = "server" | "workspace";

/** Who writes the workspace's text: the provider it brought, or the server's model. */
export type TextSource = ImageSource;

/**
 * Why the server's models are off for the workspace when the server has
 * them: its billing account has no payment method, which they need on a
 * server that bills.
 */
export type AssistantOffReason = "paymentMethod";

/**
 * One of the assistant's meters this month, on a server that bills, for
 * the server's models: the billing account's included units, what its
 * workspaces used, the most it may use, the price past the allowance and
 * the ceiling, in US dollar cents; whether the owner confirmed them.
 */
export interface AssistantMonth {
  readonly allowance: number;
  readonly ceiling: { readonly amount: number; readonly currency: string };
  readonly most: number;
  readonly price: { readonly cents: number; readonly per: number };
  readonly priceConfirmed: boolean;
  readonly resetsAt: DateTime.Utc;
  readonly used: number;
}

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
  /** The month of the server's images, on a server that bills. */
  readonly month: AssistantMonth | null;
  /** Why the server's images are off, when they are. */
  readonly reason: AssistantOffReason | null;
  /** How many of the day's requests an image costs: none from its own provider. */
  readonly requestCost: number;
  /** Who makes them, or null when nobody does. */
  readonly source: ImageSource | null;
}

/** Whether the assistant is on, and what is left of the workspace's day. */
export interface AssistantStatus {
  /**
   * Whether the assistant writes for the workspace: it brought a text
   * provider, or the server has a language model. Clients hide it
   * otherwise.
   */
  readonly available: boolean;
  /**
   * The day's requests of Peal's model, and what is left of them: they
   * bound nothing while the workspace's own provider writes.
   */
  readonly dailyLimit: number;
  readonly images: ImagesStatus;
  /** The longest text the assistant takes. */
  readonly maxTextLength: number;
  /** The month of the server's requests, on a server that bills. */
  readonly month: AssistantMonth | null;
  /** Why the server's model is off, when it is. */
  readonly reason: AssistantOffReason | null;
  readonly remaining: number;
  readonly resetsAt: DateTime.Utc;
  /** Who writes, or null when nobody does. */
  readonly source: TextSource | null;
}

// What an image costs of what bounds it: none from the workspace's own
// provider, one of the month's images on a server that bills, the day's
// requests elsewhere.
const requestCostOf = (source: ImageSource | null, metered: boolean) => {
  if (source === "workspace") {
    return 0;
  }

  return metered ? 1 : imageRequestCost;
};

// The server's model makes the images when the workspace has no provider.
const serverOrNone = (available: boolean): ImageSource | null =>
  available ? "server" : null;

// The month of a meter, as the status tells it.
const monthOf = ({
  allowance,
  allowed,
  ceiling,
  price,
  priceConfirmed,
  resetsAt,
  used,
}: MeterState): AssistantMonth => ({
  allowance,
  ceiling: { amount: Option.getOrElse(ceiling, () => 0), currency: "usd" },
  most: Option.getOrElse(allowed, () => allowance),
  price,
  priceConfirmed,
  resetsAt,
  used,
});

// The month of one of the server's meters, on a server that bills; none
// elsewhere, and while the workspace's own provider does the work.
const meterMonth = (
  workspaceId: WorkspaceId,
  meter: "assistantImages" | "assistantRequests",
  metered: boolean,
  serverWorks: boolean
) =>
  metered && serverWorks
    ? MeteredUsage.use((meters) => meters.state(workspaceId, meter)).pipe(
        Effect.orDie,
        Effect.map(Option.map(monthOf))
      )
    : Effect.succeedNone;

/** Whether the workspace can ask the assistant, and how often today. */
export const assistantStatus = Effect.fn("WritingAssistant.status")(
  function* assistantStatus(workspaceId: WorkspaceId) {
    const writingModel = yield* WritingModel;
    const imageModel = yield* ImageModel;
    const allowance = yield* AssistantAllowance;

    const ownText = yield* TextProviders.use((providers) =>
      providers.find(workspaceId)
    );

    // While the workspace has its own text provider, the server's model
    // writes nothing for it.
    const serverText = Option.isNone(ownText) && writingModel.available;

    const own = yield* ImageProviders.use((providers) =>
      providers.find(workspaceId)
    );

    const serverImages = Option.isNone(own) && (yield* imageModel.available);

    const window = usageWindowAt(yield* DateTime.now);

    const textMonth = yield* meterMonth(
      workspaceId,
      "assistantRequests",
      allowance.metered,
      serverText
    );

    const imageMonth = yield* meterMonth(
      workspaceId,
      "assistantImages",
      allowance.metered,
      serverImages
    );

    // On a server that bills, the server's models need a payment method.
    const textOff = Option.exists(textMonth, ({ most }) => most === 0);
    const imagesOff = Option.exists(imageMonth, ({ most }) => most === 0);

    const textSource: TextSource | null = Option.isSome(ownText)
      ? "workspace"
      : serverOrNone(serverText && !textOff);

    // While the workspace has its own provider, the server's model is
    // never asked, whatever it is.
    const source: ImageSource | null = Option.isSome(own)
      ? "workspace"
      : serverOrNone(serverImages && !imagesOff);

    const days = Option.isSome(textMonth)
      ? Option.none()
      : Option.some({
          dailyLimit: yield* allowance.dailyRequests(workspaceId),
          imageLimit: yield* allowance.imageRequests(workspaceId),
          used: yield* pooledUsed(workspaceId, window.day),
        });

    const status: AssistantStatus = {
      available: textSource !== null,
      // The month's most and what is left of it, on a server that bills:
      // the day's fields as older clients read them.
      dailyLimit: Option.match(textMonth, {
        onNone: () =>
          Option.getOrElse(days, () => ({ dailyLimit: 0 })).dailyLimit,
        onSome: ({ most }) => most,
      }),
      images: {
        aspects: ImageAspectSchema.literals,
        available: source !== null,
        dailyLimit: Option.match(imageMonth, {
          onNone: () =>
            Option.getOrElse(days, () => ({ imageLimit: 0 })).imageLimit,
          onSome: ({ most }) => most,
        }),
        maxPromptLength: maxImagePromptLength,
        month: Option.getOrNull(imageMonth),
        reason: imagesOff ? "paymentMethod" : null,
        requestCost: requestCostOf(source, Option.isSome(imageMonth)),
        source,
      },
      maxTextLength: maxDraftLength,
      month: Option.getOrNull(textMonth),
      reason: textOff ? "paymentMethod" : null,
      remaining: Option.match(textMonth, {
        onNone: () =>
          Option.match(days, {
            onNone: () => 0,
            onSome: ({ dailyLimit, used }) => remainingOf(dailyLimit, used),
          }),
        onSome: ({ most, used }) => remainingOf(most, used),
      }),
      resetsAt: Option.match(textMonth, {
        onNone: () => window.resetsAt,
        onSome: ({ resetsAt }) => resetsAt,
      }),
      source: textSource,
    };

    return status;
  }
);
