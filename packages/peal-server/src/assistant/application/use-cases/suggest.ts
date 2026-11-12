import { DateTime, Effect, Option } from "effect";

import { AssistantQuotaExceeded } from "#assistant/application/assistant-quota-exceeded.ts";
import { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { AssistantUsage } from "#assistant/application/ports/assistant-usage.ts";
import { PlatformLimits } from "#assistant/application/ports/platform-limits.ts";
import { WritingModel } from "#assistant/application/ports/writing-model.ts";
import type { WritingFailed } from "#assistant/application/writing-failed.ts";
import type { AssistantAction } from "#assistant/domain/assistant-action.ts";
import { checkDraft } from "#assistant/domain/draft.ts";
import {
  acceptHashtags,
  acceptText,
  HashtagsAnswerSchema,
  TextAnswerSchema,
} from "#assistant/domain/suggestion.ts";
import type { TextLimit } from "#assistant/domain/text-limit.ts";
import { usageWindowAt } from "#assistant/domain/usage-window.ts";
import { planFor } from "#assistant/domain/writing-prompt.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** What to do with which text, for a workspace. */
export interface SuggestionRequest {
  readonly action: AssistantAction;
  /** The post's text, as its author wrote it; for `write`, the subject. */
  readonly text: string;
  readonly workspaceId: WorkspaceId;
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

/**
 * Asks the model for a suggestion on a post's text, and checks what it
 * answers before anyone sees it. In order: the assistant must be on, the
 * text must be one it takes, and the workspace must have requests left
 * today. A request counts once it is sent; one the provider never ran is
 * taken back. Nothing is saved: the person accepts the suggestion or not.
 */
export const suggest = Effect.fn("WritingAssistant.suggest")(function* suggest({
  action,
  text,
  workspaceId,
}: SuggestionRequest) {
  const model = yield* WritingModel;

  if (!model.available) {
    return yield* new AssistantUnavailable();
  }

  const draft = yield* Effect.fromResult(checkDraft(text));
  const plan = planFor(action, draft, yield* limitsFor(action));

  const usage = yield* AssistantUsage;
  const window = usageWindowAt(yield* DateTime.now);

  const dailyLimit = yield* AssistantAllowance.use((allowance) =>
    allowance.dailyRequests(workspaceId)
  );

  const claimed =
    dailyLimit > 0
      ? yield* usage.claim(workspaceId, window.day, dailyLimit)
      : Option.none();

  if (Option.isNone(claimed)) {
    return yield* new AssistantQuotaExceeded({
      dailyLimit,
      resetsAt: window.resetsAt,
    });
  }

  const giveBackUnsent = (failure: AssistantUnavailable | WritingFailed) =>
    failure._tag === "WritingFailed" && failure.reason === "unreachable"
      ? usage.release(workspaceId, window.day)
      : Effect.void;

  if (plan.answer === "hashtags") {
    const answer = yield* model
      .write(plan.prompt, HashtagsAnswerSchema)
      .pipe(Effect.tapError(giveBackUnsent));

    return yield* Effect.fromResult(acceptHashtags(answer, draft));
  }

  const answer = yield* model
    .write(plan.prompt, TextAnswerSchema)
    .pipe(Effect.tapError(giveBackUnsent));

  return yield* Effect.fromResult(acceptText(answer));
});
