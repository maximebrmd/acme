import { DateTime, Effect, Option, Redacted, Result } from "effect";

import { ProviderAddressCheck } from "#assistant/application/ports/provider-address-check.ts";
import { TextProviders } from "#assistant/application/ports/text-providers.ts";
import type { StoredTextProvider } from "#assistant/application/ports/text-providers.ts";
import { TextProviderKeyRequired } from "#assistant/application/text-provider-key-required.ts";
import { TextProviderNotSet } from "#assistant/application/text-provider-not-set.ts";
import { askOwnProvider } from "#assistant/application/use-cases/own-suggestion.ts";
import { checkDraft } from "#assistant/domain/draft.ts";
import {
  checkProviderKey,
  checkProviderModel,
} from "#assistant/domain/image-provider.ts";
import type {
  ProviderAddress,
  ProviderModel,
} from "#assistant/domain/image-provider.ts";
import { acceptText, TextAnswerSchema } from "#assistant/domain/suggestion.ts";
import { TextProviderSettings } from "#assistant/domain/text-provider.ts";
import type { TextProviderKind } from "#assistant/domain/text-provider.ts";
import { planFor } from "#assistant/domain/writing-prompt.ts";
import type { Actor } from "#shared/domain/access.ts";

/** A workspace's text provider as its members read it: never its key. */
export interface TextProviderView {
  readonly baseUrl: ProviderAddress;
  readonly kind: TextProviderKind;
  /** A key is stored; it is never shown again. */
  readonly keySet: true;
  /** The stored key no longer decrypts: type it again. */
  readonly keyUnreadable: boolean;
  readonly model: ProviderModel;
  readonly updatedAt: DateTime.Utc;
}

/** What a member saves: the API, the address and the model, and the key if typed. */
export interface TextProviderChange {
  /** Left out, the stored key is kept, when the address stays the same. */
  readonly apiKey?: string;
  readonly baseUrl: string;
  readonly kind: TextProviderKind;
  readonly model: string;
}

const viewOf = ({
  keyUnreadable,
  settings,
}: StoredTextProvider): TextProviderView => ({
  baseUrl: settings.baseUrl,
  keySet: true,
  keyUnreadable,
  kind: settings.kind,
  model: settings.model,
  updatedAt: settings.updatedAt,
});

// What the connection test asks the provider: a short rewrite, as any
// member's request would be, so the test reads the answer the same way.
const testPlan = planFor(
  { _tag: "rewrite", tone: "friendly" },
  Result.getOrThrow(
    checkDraft("Peal checks that the writing assistant reaches this provider.")
  ),
  []
);

/** The actor's workspace's text provider, without its key; none when it has none. */
export const viewTextProvider = Effect.fn("TextProviderSettings.view")(
  function* viewTextProvider(actor: Actor) {
    const stored = yield* TextProviders.use((providers) =>
      providers.find(actor.workspaceId)
    );

    return stored.pipe(Option.map(viewOf));
  }
);

/**
 * Saves the workspace's text provider: the address checked (the domain's
 * rules, then the outbound guard, once now), the model one line, and the
 * key, required unless the workspace has one stored that opens and the
 * address stays exactly the same, in which case it is kept, sealed again
 * for that address: a key never follows a changed path or host. The
 * provider is not called: `testTextProvider` does, when asked.
 */
export const saveTextProvider = Effect.fn("TextProviderSettings.save")(
  function* saveTextProvider(actor: Actor, change: TextProviderChange) {
    const { workspaceId } = actor;
    const providers = yield* TextProviders;

    const baseUrl = yield* ProviderAddressCheck.use((addresses) =>
      addresses.check(change.baseUrl)
    );

    const model = yield* Effect.fromResult(checkProviderModel(change.model));

    const key =
      change.apiKey === undefined
        ? yield* providers.open(workspaceId).pipe(
            Effect.map((stored) =>
              stored.pipe(
                Option.filter(({ settings }) => settings.baseUrl === baseUrl),
                Option.flatMap(({ apiKey }) => apiKey)
              )
            ),
            Effect.flatMap(
              Option.match({
                onNone: () => Effect.fail(new TextProviderKeyRequired()),
                onSome: Effect.succeed,
              })
            )
          )
        : Redacted.make(
            yield* Effect.fromResult(checkProviderKey(change.apiKey))
          );

    const settings = new TextProviderSettings({
      baseUrl,
      kind: change.kind,
      model,
      updatedAt: yield* DateTime.now,
    });

    yield* providers.save(workspaceId, settings, key);

    const view: TextProviderView = viewOf({ keyUnreadable: false, settings });

    return view;
  }
);

/**
 * Removes the workspace's text provider and its key: the server's model
 * writes for it again, if it has one, within the workspace's daily
 * requests.
 */
export const removeTextProvider = Effect.fn("TextProviderSettings.remove")(
  function* removeTextProvider(actor: Actor) {
    yield* TextProviders.use((providers) =>
      providers.remove(actor.workspaceId)
    );
  }
);

/**
 * Sends the workspace's text provider one short request, as a member's
 * would go, to tell whether its settings work: it answers with a
 * suggestion the assistant can use, or the refusal or failure a member's
 * request would meet. It counts as one of the day's requests to that
 * provider, and nothing of Peal's.
 */
export const testTextProvider = Effect.fn("TextProviderSettings.test")(
  function* testTextProvider(actor: Actor) {
    const own = yield* TextProviders.use((providers) =>
      providers.open(actor.workspaceId)
    );

    if (Option.isNone(own)) {
      return yield* new TextProviderNotSet();
    }

    const answer = yield* askOwnProvider(
      actor,
      own.value,
      testPlan.prompt,
      TextAnswerSchema
    );

    return yield* Effect.fromResult(acceptText(answer)).pipe(Effect.asVoid);
  }
);
