import { DateTime, Effect, Option } from "effect";
import type { Schema } from "effect";

import { AssistantQuotaExceeded } from "#assistant/application/assistant-quota-exceeded.ts";
import { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { AssistantUsage } from "#assistant/application/ports/assistant-usage.ts";
import { PlatformLimits } from "#assistant/application/ports/platform-limits.ts";
import { TextProviders } from "#assistant/application/ports/text-providers.ts";
import { WritingModel } from "#assistant/application/ports/writing-model.ts";
import { askOwnProvider } from "#assistant/application/use-cases/own-suggestion.ts";
import type { WritingFailed } from "#assistant/application/writing-failed.ts";
import type { AssistantAction } from "#assistant/domain/assistant-action.ts";
import { checkDraft } from "#assistant/domain/draft.ts";
import type { Draft } from "#assistant/domain/draft.ts";
import {
  acceptHashtags,
  acceptText,
  HashtagsAnswerSchema,
  TextAnswerSchema,
} from "#assistant/domain/suggestion.ts";
import type { TextLimit } from "#assistant/domain/text-limit.ts";
import { usageWindowAt } from "#assistant/domain/usage-window.ts";
import { planFor } from "#assistant/domain/writing-prompt.ts";
import type { Actor } from "#shared/domain/access.ts";

/** What to do with which text, for whom. */
export interface SuggestionRequest {
  readonly action: AssistantAction;
  readonly actor: Actor;
  /** The post's text, as its author wrote it; for `write`, the subject. */
  readonly text: string;
}

const noLimits: readonly TextLimit[] = [];

// The limits of the platform a post is shortened or written for; the other
// actions have none.
const limitsFor = (action: AssistantAction) => {
  const platform =
    action._tag === "shorten" || action._tag === "write"
      ? action.platform
      : undefined;

  return platform === undefined
    ? Effect.succeed(noLimits)
    : PlatformLimits.use((limits) => limits.textLimitsOf(platform));
};

// The answer the plan asks for, checked before anyone sees it.
const acceptedFrom = <E, R>(
  plan: ReturnType<typeof planFor>,
  draft: Draft,
  ask: <A, I extends Readonly<Record<string, unknown>>>(
    answer: Schema.Codec<A, I>
  ) => Effect.Effect<A, E, R>
) =>
  plan.answer === "hashtags"
    ? ask(HashtagsAnswerSchema).pipe(
        Effect.flatMap((answer) =>
          Effect.fromResult(acceptHashtags(answer, draft))
        )
      )
    : ask(TextAnswerSchema).pipe(
        Effect.flatMap((answer) => Effect.fromResult(acceptText(answer)))
      );

/**
 * Asks for a suggestion on a post's text, and checks what the model
 * answers before anyone sees it. With the workspace's own text provider
 * when it brought one (`askOwnProvider`: none of Peal's daily requests,
 * on any plan); otherwise with the server's model, in order: the
 * assistant must be on, the text must be one it takes, and the workspace
 * must have requests left today. A request of Peal's counts once it is
 * sent; one the provider never ran is taken back. Nothing is saved: the
 * person accepts the suggestion or not.
 */
export const suggest = Effect.fn("WritingAssistant.suggest")(function* suggest({
  action,
  actor,
  text,
}: SuggestionRequest) {
  const { workspaceId } = actor;

  const own = yield* TextProviders.use((providers) =>
    providers.open(workspaceId)
  );

  if (Option.isSome(own)) {
    const draft = yield* Effect.fromResult(checkDraft(text));
    const plan = planFor(action, draft, yield* limitsFor(action));

    return yield* acceptedFrom(plan, draft, (answer) =>
      askOwnProvider(actor, own.value, plan.prompt, answer)
    );
  }

  const model = yield* WritingModel;

  if (!model.available) {
    return yield* new AssistantUnavailable();
  }

  const draft = yield* Effect.fromResult(checkDraft(text));
  const plan = planFor(action, draft, yield* limitsFor(action));

  const usage = yield* AssistantUsage;
  const window = usageWindowAt(yield* DateTime.now);

  const allowance = yield* AssistantAllowance;
  const dailyLimit = yield* allowance.dailyRequests(workspaceId);

  const claimed =
    dailyLimit > 0
      ? yield* usage.claim(
          workspaceId,
          window.day,
          dailyLimit,
          1,
          allowance.sharedWith(workspaceId)
        )
      : Option.none();

  if (Option.isNone(claimed)) {
    return yield* new AssistantQuotaExceeded({
      dailyLimit,
      resetsAt: window.resetsAt,
    });
  }

  const giveBackUnsent = (failure: AssistantUnavailable | WritingFailed) =>
    failure._tag === "WritingFailed" && failure.reason === "unreachable"
      ? usage.release(workspaceId, window.day, 1)
      : Effect.void;

  return yield* acceptedFrom(plan, draft, (answer) =>
    model.write(plan.prompt, answer).pipe(Effect.tapError(giveBackUnsent))
  );
});
