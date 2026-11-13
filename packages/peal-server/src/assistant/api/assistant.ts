import { Effect, Option } from "effect";
import type { DateTime } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  AssistantFailed,
  AssistantInputRejected,
  AssistantQuotaExceeded,
  AssistantSecretsNotConfigured,
  AssistantUnavailable,
  CurrentMember,
  ImageProviderAddressRefused,
  ImageProviderKeyRequired,
  ImageProviderRefused,
  MediaImportBusy,
  MediaStoreUnavailable,
  OwnImageLimitReached,
  OwnTextLimitReached,
  TextProviderAddressRefused,
  TextProviderKeyRequired,
  TextProviderNotFound,
  TextProviderRefused,
} from "peal-contract";

import type { ImageFailed } from "#assistant/application/image-failed.ts";
import type { ImageProviderView } from "#assistant/application/use-cases/image-provider-settings.ts";
import type { TextProviderView } from "#assistant/application/use-cases/text-provider-settings.ts";
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

// The provider as the contract answers it: never its key.
const providerOf = (view: ImageProviderView) => ({
  baseUrl: view.baseUrl,
  keySet: view.keySet,
  keyUnreadable: view.keyUnreadable,
  model: view.model,
  updatedAt: view.updatedAt,
});

// The text provider as the contract answers it: never its key.
const textProviderOf = (view: TextProviderView) => ({
  baseUrl: view.baseUrl,
  keySet: view.keySet,
  keyUnreadable: view.keyUnreadable,
  kind: view.kind,
  model: view.model,
  updatedAt: view.updatedAt,
});

// What the workspace's own text provider's refusals and bound answer: what
// the adapter logged is all that is said of it.
const textProviderRefused = ({
  reason,
  status,
}: {
  readonly reason: TextProviderRefused["reason"];
  readonly status: number | null;
}) => Effect.fail(new TextProviderRefused({ reason, status }));

const ownTextExhausted = ({
  dailyLimit,
  resetsAt,
}: {
  readonly dailyLimit: number;
  readonly resetsAt: DateTime.Utc;
}) => Effect.fail(new OwnTextLimitReached({ dailyLimit, resetsAt }));

const secretsNotConfigured = () =>
  Effect.logWarning(
    "A workspace's provider was not saved: the server has no keyring (PEAL_TOKEN_KEYS)"
  ).pipe(Effect.andThen(Effect.fail(new AssistantSecretsNotConfigured())));

// The contract takes the domain's rules for a model and a key (kept equal
// by test/assistant/api/contract.test.ts): one it let through and the
// domain refuses is a bug.
const settingRejected = ({ field }: { readonly field: "apiKey" | "model" }) =>
  Effect.die(`The contract let through a provider ${field} the domain refuses`);

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
              // The workspace's own provider: what the adapter logged is
              // all that is said of it.
              ImageProviderRefused: ({ reason, status }) =>
                Effect.fail(new ImageProviderRefused({ reason, status })),
              ImagesBusy: () => Effect.fail(new MediaImportBusy()),
              MissingPermission: forbidden,
              OwnImagesExhausted: ({ dailyLimit, resetsAt }) =>
                Effect.fail(new OwnImageLimitReached({ dailyLimit, resetsAt })),
              PlanLimitReached: limitReached,
            })
          );
        }),
      imageProvider: () =>
        Effect.gen(function* imageProvider() {
          const actor = actorOf(yield* CurrentMember);

          const provider = yield* assistant
            .imageProvider(actor)
            .pipe(Effect.catchTag("MissingPermission", forbidden));

          return {
            provider: Option.getOrNull(provider.pipe(Option.map(providerOf))),
          };
        }),
      removeImageProvider: () =>
        Effect.gen(function* removeImageProvider() {
          const actor = actorOf(yield* CurrentMember);

          yield* assistant
            .removeImageProvider(actor)
            .pipe(Effect.catchTag("MissingPermission", forbidden));
        }),
      setImageProvider: ({ payload }) =>
        Effect.gen(function* setImageProvider() {
          const actor = actorOf(yield* CurrentMember);

          const saved = yield* assistant.saveImageProvider(actor, payload).pipe(
            Effect.catchTags({
              ImageProviderKeyRequired: () =>
                Effect.fail(new ImageProviderKeyRequired()),
              MissingPermission: forbidden,
              ProviderAddressNotPublic: ({ reason }) =>
                Effect.fail(new ImageProviderAddressRefused({ reason })),
              ProviderAddressRejected: ({ reason }) =>
                Effect.fail(new ImageProviderAddressRefused({ reason })),
              ProviderSecretsNotConfigured: secretsNotConfigured,
              ProviderSettingRejected: settingRejected,
            })
          );

          return providerOf(saved);
        }),
      setTextProvider: ({ payload }) =>
        Effect.gen(function* setTextProvider() {
          const actor = actorOf(yield* CurrentMember);

          const saved = yield* assistant.saveTextProvider(actor, payload).pipe(
            Effect.catchTags({
              MissingPermission: forbidden,
              ProviderAddressNotPublic: ({ reason }) =>
                Effect.fail(new TextProviderAddressRefused({ reason })),
              ProviderAddressRejected: ({ reason }) =>
                Effect.fail(new TextProviderAddressRefused({ reason })),
              ProviderSecretsNotConfigured: secretsNotConfigured,
              ProviderSettingRejected: settingRejected,
              TextProviderKeyRequired: () =>
                Effect.fail(new TextProviderKeyRequired()),
            })
          );

          return textProviderOf(saved);
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
              OwnTextExhausted: ownTextExhausted,
              TextProviderRefused: textProviderRefused,
              WritingFailed: ({ reason }) =>
                Effect.fail(new AssistantFailed({ reason })),
            })
          );
        }),
      testTextProvider: () =>
        Effect.gen(function* testTextProvider() {
          const actor = actorOf(yield* CurrentMember);

          yield* assistant.testTextProvider(actor).pipe(
            Effect.catchTags({
              AnswerRejected: () =>
                Effect.fail(new AssistantFailed({ reason: "invalidAnswer" })),
              MissingPermission: forbidden,
              OwnTextExhausted: ownTextExhausted,
              TextProviderNotSet: () => Effect.fail(new TextProviderNotFound()),
              TextProviderRefused: textProviderRefused,
              WritingFailed: ({ reason }) =>
                Effect.fail(new AssistantFailed({ reason })),
            })
          );
        }),
      textProvider: () =>
        Effect.gen(function* textProvider() {
          const actor = actorOf(yield* CurrentMember);

          const provider = yield* assistant
            .textProvider(actor)
            .pipe(Effect.catchTag("MissingPermission", forbidden));

          return {
            provider: Option.getOrNull(
              provider.pipe(Option.map(textProviderOf))
            ),
          };
        }),
      removeTextProvider: () =>
        Effect.gen(function* removeTextProvider() {
          const actor = actorOf(yield* CurrentMember);

          yield* assistant
            .removeTextProvider(actor)
            .pipe(Effect.catchTag("MissingPermission", forbidden));
        }),
    });
  })
);
