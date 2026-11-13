import type { Schema } from "effect";
import { Context, Effect, Layer, Option, Ref, Stream } from "effect";
import { AiError, LanguageModel } from "effect/ai";
import type { Prompt, Response } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { Dns } from "effect/net";
import { SqlClient } from "effect/sql";

import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { GeneratedImages } from "#assistant/application/ports/generated-images.ts";
import { ProviderAddressCheck } from "#assistant/application/ports/provider-address-check.ts";
import { WritingAssistant } from "#assistant/application/writing-assistant.ts";
import { ProviderAddressSchema } from "#assistant/domain/image-provider.ts";
import { CipherProviderSecrets } from "#assistant/infrastructure/cipher-provider-secrets.ts";
import { CountedImageSlots } from "#assistant/infrastructure/counted-image-slots.ts";
import { CountedTextSlots } from "#assistant/infrastructure/counted-text-slots.ts";
import { DrizzleAssistantUsageLive } from "#assistant/infrastructure/drizzle-assistant-usage.ts";
import { DrizzleImageProvidersLive } from "#assistant/infrastructure/drizzle-image-providers.ts";
import { DrizzleOwnImageCountsLive } from "#assistant/infrastructure/drizzle-own-image-counts.ts";
import { DrizzleOwnTextCountsLive } from "#assistant/infrastructure/drizzle-own-text-counts.ts";
import { DrizzleTextProvidersLive } from "#assistant/infrastructure/drizzle-text-providers.ts";
import { GuardedProviderAddressCheck } from "#assistant/infrastructure/guarded-provider-address-check.ts";
import { languageModelWritingModel } from "#assistant/infrastructure/language-model-writing-model.ts";
import { LibraryGeneratedImagesLive } from "#assistant/infrastructure/library-generated-images.ts";
import { openAiCompatibleOwnImageModel } from "#assistant/infrastructure/openai-compatible-own-image-model.ts";
import { PublishingPlatformLimitsLive } from "#assistant/infrastructure/publishing-platform-limits.ts";
import { UnavailableImageModelLive } from "#assistant/infrastructure/unavailable-image-model.ts";
import { UnavailableWritingModelLive } from "#assistant/infrastructure/unavailable-writing-model.ts";
import { Ids } from "#shared/application/ids.ts";
import type { MeteredUsage } from "#shared/application/metered-usage.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { FakeImageModelLive } from "#test/assistant/fake-image-model.ts";
import { FakeOwnImageModelLive } from "#test/assistant/fake-own-image-model.ts";
import { FakeOwnWritingModelLive } from "#test/assistant/fake-own-writing-model.ts";
import { UnmeteredTest } from "#test/billing/support.ts";
import { OpenOutboundGuard, TokenCipherTest } from "#test/channels/support.ts";
import { mediaTestWith } from "#test/media/support.ts";
import { fakeMeters } from "#test/shared/support.ts";
import type { FakeMetersLedger } from "#test/shared/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

/**
 * What the fake model answers next: JSON text, a provider failure, or
 * nothing at all.
 */
export type Reply =
  | { readonly _tag: "text"; readonly text: string }
  | { readonly _tag: "failure"; readonly reason: AiError.AiErrorReason }
  | { readonly _tag: "silence" };

/** The model answers with this JSON document. */
export const answer = (value: typeof Schema.Json.Type): Reply => ({
  _tag: "text",
  text: JSON.stringify(value),
});

/** The model answers with this text as it is, JSON or not. */
export const rawAnswer = (text: string): Reply => ({ _tag: "text", text });

/** The provider fails for this reason. */
export const failure = (reason: AiError.AiErrorReason): Reply => ({
  _tag: "failure",
  reason,
});

/** The provider takes the request and never answers. */
export const silence: Reply = { _tag: "silence" };

/**
 * A language model that answers what the test scripted, and records every
 * prompt it was sent, as the provider would have received it.
 */
export class FakeModel extends Context.Service<
  FakeModel,
  {
    /** Answers `reply` from now on. */
    readonly replyWith: (reply: Reply) => Effect.Effect<void>;
    /** The prompts the model was sent, oldest first. */
    readonly prompts: Effect.Effect<readonly Prompt.Prompt[]>;
  }
>()("peal-server/test/assistant/FakeModel") {}

const partsOf = (
  reply: Reply
): Effect.Effect<Response.PartEncoded[], AiError.AiError> => {
  if (reply._tag === "silence") {
    return Effect.never;
  }

  return reply._tag === "text"
    ? Effect.succeed([{ text: reply.text, type: "text" }])
    : Effect.fail(
        AiError.make({
          method: "generateText",
          module: "FakeModel",
          reason: reply.reason,
        })
      );
};

/** The fake model, as LanguageModel, and its script as FakeModel. */
export const FakeModelLive = Layer.effectContext(
  Effect.gen(function* FakeModelLive() {
    const next = yield* Ref.make<Reply>(answer({ text: "A suggestion." }));
    const sent = yield* Ref.make<readonly Prompt.Prompt[]>([]);

    const model = yield* LanguageModel.make({
      generateText: (options) =>
        Ref.update(sent, (prompts) => [...prompts, options.prompt]).pipe(
          Effect.andThen(Ref.get(next)),
          Effect.flatMap(partsOf)
        ),
      streamText: () => Stream.empty,
    });

    return Context.make(LanguageModel.LanguageModel, model).pipe(
      Context.add(
        FakeModel,
        FakeModel.of({
          prompts: Ref.get(sent),
          replyWith: (reply) => Ref.set(next, reply),
        })
      )
    );
  })
);

/** The fake model behind the assistant's WritingModel, as the server wires it. */
export const FakeWritingModelLive = languageModelWritingModel({
  model: "fake-model",
  provider: "fake",
}).pipe(Layer.provideMerge(FakeModelLive));

/** No library to keep images in: for tests of the text alone. */
export const NoGeneratedImages = Layer.succeed(
  GeneratedImages,
  GeneratedImages.of({
    roomFor: () => Effect.die("no image is made in this test"),
    store: () => Effect.die("no image is made in this test"),
  })
);

/**
 * Every workspace may send `dailyRequests` a day, of which images may
 * take `imageRequests`; or, `metered`, as a server that bills, through the
 * meters given beside it.
 */
export const allowanceOf = (
  dailyRequests: number,
  imageRequests = dailyRequests,
  metered = false
) =>
  Layer.succeed(
    AssistantAllowance,
    AssistantAllowance.of({
      dailyRequests: () => Effect.succeed(dailyRequests),
      imageRequests: () => Effect.succeed(imageRequests),
      metered,
      // A server that does not bill: no pool is ever read.
      pooled: false,
      sharedWith: () => Effect.die("no pool is read where none is shared"),
      sharingWith: () => Effect.die("no pool is read where none is shared"),
    })
  );

/**
 * A library with room before an image is made, and none once it was: the
 * plan filled meanwhile.
 */
export const FullLibrary = Layer.succeed(
  GeneratedImages,
  GeneratedImages.of({
    roomFor: () => Effect.void,
    store: () =>
      Effect.fail(
        new PlanLimitReached({
          allowed: 1000,
          limit: "mediaStorage",
          needed: 2000,
          used: 1000,
        })
      ),
  })
);

/**
 * The hosts a workspace may type for its provider in these tests: public
 * ones, and one that leads inside, as an attacker would set it up.
 */
export const providerHosts = {
  "images.example.com": ["93.184.215.14"],
  "images.internal.example": ["10.0.0.8"],
  "other-images.example.com": ["93.184.215.15"],
};

/**
 * The image providers workspaces brought, as the server keeps them: in
 * Postgres, their keys sealed with the synthetic keyring, their addresses
 * checked by the real outbound guard on `providerHosts`; and a fake
 * provider behind them (FakeOwnImageModel), which no request leaves.
 */
const SealedImageProviders = Layer.mergeAll(
  DrizzleImageProvidersLive,
  DrizzleTextProvidersLive
).pipe(
  Layer.provide(CipherProviderSecrets.pipe(Layer.provide(TokenCipherTest))),
  Layer.orDie
);

/**
 * The image and text providers workspaces brought, as the server keeps
 * them, with a fake behind each (FakeOwnImageModel, FakeOwnWritingModel),
 * which no request leaves.
 */
export const ImageProvidersTest = Layer.mergeAll(
  SealedImageProviders,
  DrizzleOwnImageCountsLive,
  DrizzleOwnTextCountsLive,
  CountedTextSlots,
  FakeOwnWritingModelLive,
  GuardedProviderAddressCheck.pipe(
    Layer.provide(
      OutboundGuard.layer.pipe(
        Layer.provide(Dns.layerStatic({ hosts: providerHosts })),
        Layer.orDie
      )
    ),
    Layer.orDie
  ),
  FakeOwnImageModelLive
);

/**
 * Every address taken as it is written: for a provider on loopback, which
 * the domain's rules (HTTPS on 443) and the real guard refuse. Both are
 * tested on their own.
 */
const AnyProviderAddress = Layer.succeed(
  ProviderAddressCheck,
  ProviderAddressCheck.of({
    check: (text) => Effect.succeed(ProviderAddressSchema.make(text)),
  })
);

/**
 * The image providers workspaces brought, with the real adapter behind
 * them and a guard that lets every address through, saving included.
 */
export const LoopbackImageProvidersTest = Layer.mergeAll(
  SealedImageProviders,
  DrizzleOwnImageCountsLive,
  DrizzleOwnTextCountsLive,
  CountedTextSlots,
  FakeOwnWritingModelLive,
  AnyProviderAddress,
  openAiCompatibleOwnImageModel({ timeout: "10 seconds" }).pipe(
    Layer.provide(OpenOutboundGuard),
    Layer.provide(FetchHttpClient.layer)
  )
);

/**
 * Postgres from DATABASE_URL, brought up to date, and random ids, so runs
 * and parallel suites never collide.
 */
export const DatabaseTest = Layer.mergeAll(MigrationsLive, IdsLive).pipe(
  Layer.provideMerge(DatabaseLive)
);

/**
 * The assistant's use cases as the server wires them, with the fake model
 * (or no model at all) and a daily allowance. Built for each test, so each
 * starts with a fresh script; it needs DatabaseTest.
 */
export const assistantTest = ({
  dailyRequests = 3,
  meters = fakeMeters({ allowed: Option.none() }),
  metered = false,
  model = "fake",
}: {
  readonly dailyRequests?: number;
  /** The meters, as a server that bills claims them (`metered`). */
  readonly meters?: Layer.Layer<MeteredUsage | FakeMetersLedger>;
  readonly metered?: boolean;
  readonly model?: "fake" | "off";
} = {}) =>
  WritingAssistant.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        DrizzleAssistantUsageLive,
        allowanceOf(dailyRequests, dailyRequests, metered),
        PublishingPlatformLimitsLive,
        UnavailableImageModelLive,
        CountedImageSlots,
        NoGeneratedImages
      )
    ),
    Layer.provideMerge(meters),
    Layer.provideMerge(ImageProvidersTest),
    Layer.provideMerge(
      model === "fake"
        ? FakeWritingModelLive
        : Layer.merge(UnavailableWritingModelLive, FakeModelLive)
    )
  );

const syntheticUser = UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

/** Someone signed in, acting in the workspace with these permissions. */
export const actorIn = (
  workspaceId: WorkspaceId,
  permissions: readonly Permission[] = permissionsFor("contributor")
): Actor =>
  new Actor({
    permissions,
    subject: {
      _tag: "user",
      impersonatedBy: Option.none(),
      userId: syntheticUser,
    },
    workspaceId,
  });

/**
 * A workspace no other test uses, whose usage rows go when the test ends.
 */
export const freshWorkspace = Effect.gen(function* freshWorkspace() {
  const workspaceId = WorkspaceIdSchema.make(yield* Ids.use((ids) => ids.next));
  const sql = yield* SqlClient.SqlClient;

  yield* Effect.addFinalizer(() =>
    sql`DELETE FROM assistant.daily_usage WHERE workspace_id = ${workspaceId}`.pipe(
      Effect.andThen(
        sql`DELETE FROM assistant.image_providers WHERE workspace_id = ${workspaceId}`
      ),
      Effect.andThen(
        sql`DELETE FROM assistant.own_image_days WHERE workspace_id = ${workspaceId}`
      ),
      Effect.andThen(
        sql`DELETE FROM assistant.text_providers WHERE workspace_id = ${workspaceId}`
      ),
      Effect.andThen(
        sql`DELETE FROM assistant.own_text_days WHERE workspace_id = ${workspaceId}`
      ),
      Effect.ignore
    )
  );

  return workspaceId;
});

/** Each message of a prompt, with its role and its text; none without one. */
export const messagesOf = (prompt: Prompt.Prompt | undefined) =>
  (prompt?.content ?? []).map((message) => {
    if (message.role === "system") {
      return { role: message.role, text: message.content };
    }

    if (message.role === "user") {
      return {
        role: message.role,
        text: message.content
          .map((part) => (part.type === "text" ? part.text : ""))
          .join(""),
      };
    }

    return { role: message.role, text: "" };
  });

export { FakeImageModel } from "#test/assistant/fake-image-model.ts";

export { FakeOwnImageModel } from "#test/assistant/fake-own-image-model.ts";

export { FakeOwnWritingModel } from "#test/assistant/fake-own-writing-model.ts";

export type { OwnTextReply } from "#test/assistant/fake-own-writing-model.ts";

export type { OwnImageReply } from "#test/assistant/fake-own-image-model.ts";

export type { ImageReply } from "#test/assistant/fake-image-model.ts";

/**
 * The assistant's use cases as the server wires them, with the fake
 * writing and image models (or only the script of the image model, with
 * no model behind it), storing what the image
 * model makes in the media context, on the entitlements given. Built for
 * each test; it needs DatabaseTest and the store's settings.
 */
export const imagesTest = ({
  dailyRequests = 10,
  entitlements = UnmeteredTest,
  imageRequests = dailyRequests,
  images = "fake",
  library = "media",
  meters = fakeMeters({ allowed: Option.none() }),
  metered = false,
  providers = "fake",
}: {
  readonly dailyRequests?: number;
  /** The meters, as a server that bills claims them (`metered`). */
  readonly meters?: Layer.Layer<MeteredUsage | FakeMetersLedger>;
  readonly metered?: boolean;
  readonly entitlements?: typeof UnmeteredTest;
  /** The requests images may take each day: none on a trial. */
  readonly imageRequests?: number;
  readonly images?: "fake" | "off";
  /**
   * Where images are kept: the media context, or a library whose plan
   * turns out full once the image is made.
   */
  readonly library?: "full" | "media";
  /**
   * The providers workspaces bring: a fake behind the real store and
   * guard, or the real adapter calling whatever address was saved, on
   * loopback (`LoopbackImageProvidersTest`).
   */
  readonly providers?: "fake" | "loopback";
} = {}) =>
  WritingAssistant.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        DrizzleAssistantUsageLive,
        allowanceOf(dailyRequests, imageRequests, metered),
        PublishingPlatformLimitsLive,
        CountedImageSlots,
        library === "media"
          ? LibraryGeneratedImagesLive.pipe(
              Layer.provide(mediaTestWith(entitlements))
            )
          : FullLibrary
      )
    ),
    Layer.provideMerge(meters),
    Layer.provideMerge(FakeWritingModelLive),
    Layer.provideMerge(
      // With the loopback providers, the fake's script stays with nothing
      // behind it: the real adapter, merged last, is the OwnImageModel.
      providers === "fake"
        ? ImageProvidersTest
        : Layer.merge(FakeOwnImageModelLive, LoopbackImageProvidersTest)
    ),
    Layer.provideMerge(
      images === "fake"
        ? FakeImageModelLive
        : Layer.merge(FakeImageModelLive, UnavailableImageModelLive)
    )
  );
