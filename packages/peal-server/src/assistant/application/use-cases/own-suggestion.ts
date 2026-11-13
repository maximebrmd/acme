import { DateTime, Effect, Option } from "effect";
import type { Schema } from "effect";

import { OwnTextBusy } from "#assistant/application/own-text-busy.ts";
import { OwnTextExhausted } from "#assistant/application/own-text-exhausted.ts";
import { OwnTextCounts } from "#assistant/application/ports/own-text-counts.ts";
import { OwnWritingModel } from "#assistant/application/ports/own-writing-model.ts";
import type { OpenedTextProvider } from "#assistant/application/ports/text-providers.ts";
import { TextSlots } from "#assistant/application/ports/text-slots.ts";
import { TextProviderRefused } from "#assistant/application/text-provider-refused.ts";
import { ownTextRequestsPerDay } from "#assistant/domain/text-provider.ts";
import { usageWindowAt } from "#assistant/domain/usage-window.ts";
import type { WritingPrompt } from "#assistant/domain/writing-prompt.ts";
import type { Actor } from "#shared/domain/access.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";

/**
 * Asks the workspace's own text provider for an answer: never Peal's
 * model, not even when it fails, nor when its key no longer opens. Staff
 * acting as a member are refused, as the workspace's account at its
 * provider would pay; a key that no longer opens asks nobody anything;
 * then one of the `ownTextAtOnce` slots (OwnTextBusy past them), and one
 * of the `ownTextRequestsPerDay` the workspace's provider is
 * sent each day is counted, whatever the call ends with. Nothing of
 * Peal's daily requests is read or counted, whatever the plan.
 */
export const askOwnProvider = <A, I extends Readonly<Record<string, unknown>>>(
  actor: Actor,
  { apiKey, settings }: OpenedTextProvider,
  prompt: WritingPrompt,
  answer: Schema.Codec<A, I>
) =>
  Effect.gen(function* askingOwnProvider() {
    if (
      actor.subject._tag === "user" &&
      Option.isSome(actor.subject.impersonatedBy)
    ) {
      return yield* new MissingPermission({
        permission: "assistant:configure",
      });
    }

    if (Option.isNone(apiKey)) {
      return yield* new TextProviderRefused({
        reason: "keyUnreadable",
        status: null,
      });
    }

    // One of the requests the workspace and the server run at once, for as
    // long as this one takes: refused before it is counted.
    if (!(yield* TextSlots.use((slots) => slots.take(actor.workspaceId)))) {
      return yield* new OwnTextBusy();
    }

    // Every request counts, whatever it ends with: what bounds a
    // workspace's hold on the server, since Peal's allowance does not.
    const window = usageWindowAt(yield* DateTime.now);

    const counted = yield* OwnTextCounts.use((counts) =>
      counts.claim(actor.workspaceId, window.day, ownTextRequestsPerDay)
    );

    if (Option.isNone(counted)) {
      return yield* new OwnTextExhausted({
        dailyLimit: ownTextRequestsPerDay,
        resetsAt: window.resetsAt,
      });
    }

    return yield* OwnWritingModel.use((model) =>
      model.write(
        {
          apiKey: apiKey.value,
          baseUrl: settings.baseUrl,
          kind: settings.kind,
          model: settings.model,
        },
        prompt,
        answer
      )
    );
  }).pipe(
    // The slot goes back when the request ends, however it ends.
    Effect.scoped,
    Effect.withSpan("WritingAssistant.askOwnProvider")
  );
