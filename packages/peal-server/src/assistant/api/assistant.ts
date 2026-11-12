import { Effect, Option } from "effect";
import type { DateTime } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  AssistantFailed,
  AssistantInputRejected,
  AssistantQuotaExceeded,
  AssistantUnavailable,
  CurrentMember,
  MediaImportBusy,
  MediaStoreUnavailable,
} from "peal-contract";

import type { ImageFailed } from "#assistant/application/image-failed.ts";
import { WritingAssistant } from "#assistant/application/writing-assistant.ts";
import { imageRequestCost } from "#assistant/domain/image-limits.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { limitRefusal } from "#shared/api/limit-reached.ts";
import { UpgradePaths } from "#shared/application/upgrade-paths.ts";
import type { Actor } from "#shared/domain/access.ts";

// An image's failure as the contract tells it, beside the text's.
const imageReasons: Readonly<
  Record<ImageFailed["reason"], AssistantFailed["reason"]>
> = {
  refused: "declined",
  timedOut: "timedOut",
  unreachable: "unreachable",
  unusableAnswer: "invalidAnswer",
};

// The answers say what went wrong by kind only: neither the text nor what
// the model answered ever reaches an error or a log.
export const AssistantHandlers = HttpApiBuilder.group(
  Api,
  "assistant",
  Effect.fn(function* assistantHandlers(handlers) {
    const assistant = yield* WritingAssistant;
    const paths = yield* UpgradePaths;
    const limitReached = yield* limitRefusal;

    // The quota's refusal, with the smallest plan whose day holds `needed`
    // requests, and where to order it.
    const quotaExceeded = (
      actor: Actor,
      {
        dailyLimit,
        needed,
        resetsAt,
      }: {
        readonly dailyLimit: number;
        readonly needed: number;
        readonly resetsAt: DateTime.Utc;
      }
    ) =>
      paths.from(actor.workspaceId, "assistantRequests", needed).pipe(
        Effect.flatMap((path) =>
          Effect.fail(
            new AssistantQuotaExceeded({
              // A server that does not bill has no billing page to send
              // anyone to.
              billingUrl: Option.isSome(path.plan) ? path.billingUrl : null,
              dailyLimit,
              plan: Option.getOrNull(path.plan),
              planWithRoom: Option.getOrNull(path.planWithRoom),
              resetsAt,
            })
          )
        )
      );

    return handlers.handleAll({
      generateImage: ({ payload }) =>
        Effect.gen(function* generateImage() {
          const actor = actorOf(yield* CurrentMember);

          return yield* assistant.generateImage(actor, payload).pipe(
            Effect.catchTags({
              AssistantQuotaExceeded: ({ dailyLimit, resetsAt }) =>
                quotaExceeded(actor, {
                  dailyLimit,
                  needed: Math.max(dailyLimit + 1, imageRequestCost),
                  resetsAt,
                }),
              AssistantUnavailable: () =>
                Effect.fail(new AssistantUnavailable()),
              DraftRejected: ({ maxLength, reason }) =>
                Effect.fail(new AssistantInputRejected({ maxLength, reason })),
              ImageFailed: ({ reason }) =>
                Effect.fail(
                  new AssistantFailed({ reason: imageReasons[reason] })
                ),
              ImageNotStored: () => Effect.fail(new MediaStoreUnavailable()),
              ImagesBusy: () => Effect.fail(new MediaImportBusy()),
              MissingPermission: forbidden,
              PlanLimitReached: limitReached,
            })
          );
        }),
      status: () =>
        Effect.gen(function* status() {
          const actor = actorOf(yield* CurrentMember);

          return yield* assistant
            .status(actor)
            .pipe(Effect.catchTag("MissingPermission", forbidden));
        }),
      suggest: ({ payload }) =>
        Effect.gen(function* suggest() {
          const actor = actorOf(yield* CurrentMember);

          return yield* assistant.suggest(actor, payload).pipe(
            Effect.catchTags({
              AnswerRejected: () =>
                Effect.fail(new AssistantFailed({ reason: "invalidAnswer" })),
              AssistantQuotaExceeded: ({ dailyLimit, resetsAt }) =>
                quotaExceeded(actor, {
                  dailyLimit,
                  needed: dailyLimit + 1,
                  resetsAt,
                }),
              AssistantUnavailable: () =>
                Effect.fail(new AssistantUnavailable()),
              DraftRejected: ({ maxLength, reason }) =>
                Effect.fail(new AssistantInputRejected({ maxLength, reason })),
              MissingPermission: forbidden,
              WritingFailed: ({ reason }) =>
                Effect.fail(new AssistantFailed({ reason })),
            })
          );
        }),
    });
  })
);
