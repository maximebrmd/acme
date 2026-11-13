import { assert, layer } from "@effect/vitest";
import { Effect, Fiber, Option } from "effect";
import { SqlClient } from "effect/sql";

import { WritingAssistant } from "#assistant/application/writing-assistant.ts";
import type { AssistantRequest } from "#assistant/application/writing-assistant.ts";
import {
  ownTextAtOnce,
  ownTextRequestsPerDay,
} from "#assistant/domain/text-provider.ts";
import { Actor } from "#shared/domain/access.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  actorIn,
  assistantTest,
  DatabaseTest,
  FakeModel,
  FakeOwnWritingModel,
  freshWorkspace,
} from "#test/assistant/support.ts";
import type { OwnTextReply } from "#test/assistant/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The text provider a workspace brings, on the real store, keyring and
// outbound guard (`providerHosts`), with a fake provider behind it that no
// request leaves. Peal's own model is the fake model, whose prompts show
// whether it was asked.

const syntheticKey = "synthetic-workspace-text-key";

const rewrite: AssistantRequest = {
  action: { _tag: "rewrite", tone: "professional" },
  text: "we shipped it!! come see",
};

const admin = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, permissionsFor("admin"));

// The workspace brings its own provider, as an admin sets it.
const bringProvider = (workspaceId: WorkspaceId) =>
  WritingAssistant.use((assistant) =>
    assistant.saveTextProvider(admin(workspaceId), {
      apiKey: syntheticKey,
      baseUrl: "https://images.example.com/v1/",
      kind: "openai-compatible",
      model: "synthetic-text-model",
    })
  );

// Asks for `request`, the workspace's own provider answering `reply`.
const askOwn = (
  workspaceId: WorkspaceId,
  reply: OwnTextReply,
  request: AssistantRequest = rewrite,
  actor: Actor = actorIn(workspaceId)
) =>
  FakeOwnWritingModel.use((model) => model.replyWith(reply)).pipe(
    Effect.andThen(
      WritingAssistant.use((assistant) => assistant.suggest(actor, request))
    )
  );

const ownAnswer = (text: string): OwnTextReply => ({
  _tag: "answer",
  value: { text },
});

const ownCalls = FakeOwnWritingModel.use((model) => model.calls);

const peals = FakeModel.use((model) => model.prompts);

const statusOf = (workspaceId: WorkspaceId) =>
  WritingAssistant.use((assistant) => assistant.status(actorIn(workspaceId)));

layer(DatabaseTest, { timeout: "60 seconds" })(
  "text written by the workspace's own provider",
  (it) => {
    it.effect(
      "writes with the workspace's key, counting none of the day's requests",
      () =>
        Effect.gen(function* own() {
          const workspaceId = yield* freshWorkspace;

          yield* bringProvider(workspaceId);

          const suggestion = yield* askOwn(
            workspaceId,
            ownAnswer("  We shipped it. Come and see.\n")
          );

          assert.deepStrictEqual(suggestion, {
            _tag: "text",
            text: "We shipped it. Come and see.",
          });

          const [call] = yield* ownCalls;

          assert.deepInclude(call, {
            apiKey: syntheticKey,
            baseUrl: "https://images.example.com/v1",
            kind: "openai-compatible",
            model: "synthetic-text-model",
          });
          // The draft goes as data, in the user message, as to Peal's model.
          assert.include(call?.prompt.message ?? "", "we shipped it!!");
          assert.notInclude(call?.prompt.instructions ?? "", "we shipped it");

          const status = yield* statusOf(workspaceId);

          assert.deepInclude(status, {
            available: true,
            remaining: 3,
            source: "workspace",
          });
          assert.lengthOf(yield* peals, 0);
        }).pipe(Effect.provide(assistantTest()))
    );

    it.effect(
      "writes on a day of no requests, and on a server with no model of its own",
      () =>
        Effect.gen(function* free() {
          const workspaceId = yield* freshWorkspace;

          assert.deepInclude(yield* statusOf(workspaceId), {
            available: false,
            source: null,
          });

          yield* bringProvider(workspaceId);

          assert.deepInclude(yield* statusOf(workspaceId), {
            available: true,
            source: "workspace",
          });

          const suggestion = yield* askOwn(
            workspaceId,
            ownAnswer("We shipped it.")
          );

          assert.strictEqual(suggestion._tag, "text");
        }).pipe(
          Effect.provide(assistantTest({ dailyRequests: 0, model: "off" }))
        )
    );

    it.effect("suggests hashtags with it, as with Peal's model", () =>
      Effect.gen(function* hashtags() {
        const workspaceId = yield* freshWorkspace;

        yield* bringProvider(workspaceId);

        const suggestion = yield* askOwn(
          workspaceId,
          { _tag: "answer", value: { hashtags: ["#launch", "#shipping"] } },
          { action: { _tag: "hashtags" }, text: "We shipped it." }
        );

        assert.deepStrictEqual(
          suggestion._tag === "hashtags" ? [...suggestion.hashtags] : [],
          ["#launch", "#shipping"]
        );
      }).pipe(Effect.provide(assistantTest()))
    );

    it.effect(
      "fails when its provider refuses or fails, and never asks Peal's model instead",
      () =>
        Effect.gen(function* failing() {
          const workspaceId = yield* freshWorkspace;

          yield* bringProvider(workspaceId);

          const refused = yield* askOwn(workspaceId, {
            _tag: "settingsRefused",
            status: 401,
          }).pipe(Effect.flip);

          assert.deepInclude(refused, {
            _tag: "TextProviderRefused",
            reason: "settingsRefused",
            status: 401,
          });

          const failed = yield* askOwn(workspaceId, {
            _tag: "failure",
            reason: "unreachable",
          }).pipe(Effect.flip);

          assert.deepInclude(failed, {
            _tag: "WritingFailed",
            reason: "unreachable",
          });

          const unusable = yield* askOwn(workspaceId, ownAnswer("")).pipe(
            Effect.flip
          );

          assert.strictEqual(unusable._tag, "AnswerRejected");
          assert.lengthOf(yield* peals, 0);
          assert.strictEqual(
            (yield* statusOf(workspaceId)).remaining,
            3,
            "nothing of Peal's day was counted"
          );
        }).pipe(Effect.provide(assistantTest()))
    );

    it.effect(
      "asks nobody with a key that no longer opens, and says it must be typed again",
      () =>
        Effect.gen(function* unreadable() {
          const workspaceId = yield* freshWorkspace;
          const sql = yield* SqlClient.SqlClient;

          yield* bringProvider(workspaceId);

          // The address moved without the key being typed again.
          yield* sql`UPDATE assistant.text_providers SET base_url = 'https://other-images.example.com/v1' WHERE workspace_id = ${workspaceId}`;

          const refused = yield* askOwn(workspaceId, ownAnswer("Hi.")).pipe(
            Effect.flip
          );

          assert.deepInclude(refused, {
            _tag: "TextProviderRefused",
            reason: "keyUnreadable",
            status: null,
          });
          assert.lengthOf(yield* ownCalls, 0);
          assert.lengthOf(yield* peals, 0);

          const view = yield* WritingAssistant.use((assistant) =>
            assistant.textProvider(admin(workspaceId))
          );

          assert.isTrue(
            Option.exists(view, ({ keyUnreadable }) => keyUnreadable)
          );
        }).pipe(Effect.provide(assistantTest()))
    );

    it.effect(
      "refuses staff acting as a member: the workspace's account would pay",
      () =>
        Effect.gen(function* impersonated() {
          const workspaceId = yield* freshWorkspace;
          const member = actorIn(workspaceId);

          const staff = new Actor({
            permissions: member.permissions,
            subject: {
              _tag: "user",
              impersonatedBy: Option.some(
                UserIdSchema.make("1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b")
              ),
              userId: UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"),
            },
            workspaceId,
          });

          yield* bringProvider(workspaceId);

          const refused = yield* askOwn(
            workspaceId,
            ownAnswer("Hi."),
            rewrite,
            staff
          ).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "MissingPermission");
          assert.lengthOf(yield* ownCalls, 0);
        }).pipe(Effect.provide(assistantTest()))
    );

    it.effect(
      "holds so many requests at once a workspace, refusing the next at once, and frees the slot when one ends",
      () =>
        Effect.gen(function* busy() {
          const workspaceId = yield* freshWorkspace;
          const other = yield* freshWorkspace;
          const model = yield* FakeOwnWritingModel;

          yield* bringProvider(workspaceId);
          yield* bringProvider(other);
          yield* model.replyWith({ _tag: "held" });

          const waiting = yield* Effect.forEach(
            Array.from({ length: ownTextAtOnce.perWorkspace }),
            () =>
              WritingAssistant.use((assistant) =>
                assistant.suggest(actorIn(workspaceId), rewrite)
              ).pipe(Effect.forkChild)
          );

          yield* model.arrived(ownTextAtOnce.perWorkspace);

          const refused = yield* WritingAssistant.use((assistant) =>
            assistant.suggest(actorIn(workspaceId), rewrite)
          ).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "OwnTextBusy");
          // Refused before it was counted or sent.
          assert.lengthOf(yield* ownCalls, ownTextAtOnce.perWorkspace);

          // Another workspace's request still reaches its provider.
          const elsewhere = yield* WritingAssistant.use((assistant) =>
            assistant.suggest(actorIn(other), rewrite)
          ).pipe(Effect.forkChild);

          yield* model.arrived(1);
          yield* model.release({ _tag: "answer", value: { text: "Done." } });

          yield* Effect.forEach([...waiting, elsewhere], Fiber.join);

          const after = yield* WritingAssistant.use((assistant) =>
            assistant.suggest(actorIn(workspaceId), rewrite)
          );

          assert.strictEqual(after._tag, "text");
        }).pipe(Effect.provide(assistantTest()))
    );

    it.effect(
      "sends its provider no more than the day's bound, whatever each request ended with",
      () =>
        Effect.gen(function* bounded() {
          const workspaceId = yield* freshWorkspace;
          const sql = yield* SqlClient.SqlClient;

          yield* bringProvider(workspaceId);

          yield* askOwn(workspaceId, {
            _tag: "failure",
            reason: "timedOut",
          }).pipe(Effect.ignore);

          const [counted] = yield* sql<{
            readonly requests: number;
          }>`SELECT requests FROM assistant.own_text_days WHERE workspace_id = ${workspaceId}`;

          assert.strictEqual(counted?.requests, 1);

          yield* sql`UPDATE assistant.own_text_days SET requests = ${ownTextRequestsPerDay} WHERE workspace_id = ${workspaceId}`;

          const refused = yield* askOwn(workspaceId, ownAnswer("Hi.")).pipe(
            Effect.flip
          );

          assert.deepInclude(refused, {
            _tag: "OwnTextExhausted",
            dailyLimit: ownTextRequestsPerDay,
          });
          assert.lengthOf(yield* ownCalls, 1);
        }).pipe(Effect.provide(assistantTest()))
    );
  }
);

layer(DatabaseTest, { timeout: "60 seconds" })(
  "the workspace's text provider settings",
  (it) => {
    it.effect("lets owners and admins set it, and no other role", () =>
      Effect.gen(function* roles() {
        const workspaceId = yield* freshWorkspace;
        const assistant = yield* WritingAssistant;

        for (const role of ["editor", "contributor", "viewer"]) {
          const actor = actorIn(workspaceId, permissionsFor(role));

          const refusals = yield* Effect.all([
            assistant.textProvider(actor).pipe(Effect.flip),
            assistant
              .saveTextProvider(actor, {
                apiKey: syntheticKey,
                baseUrl: "https://images.example.com/v1",
                kind: "anthropic",
                model: "synthetic-text-model",
              })
              .pipe(Effect.flip),
            assistant.removeTextProvider(actor).pipe(Effect.flip),
            assistant.testTextProvider(actor).pipe(Effect.flip),
          ]);

          assert.deepStrictEqual(
            refusals.map((refusal) => refusal._tag),
            [
              "MissingPermission",
              "MissingPermission",
              "MissingPermission",
              "MissingPermission",
            ],
            role
          );
        }

        for (const role of ["owner", "admin"]) {
          const saved = yield* assistant.saveTextProvider(
            actorIn(workspaceId, permissionsFor(role)),
            {
              apiKey: syntheticKey,
              baseUrl: "https://images.example.com",
              kind: "anthropic",
              model: "synthetic-text-model",
            }
          );

          assert.deepStrictEqual(
            {
              baseUrl: saved.baseUrl,
              keySet: saved.keySet,
              keyUnreadable: saved.keyUnreadable,
              kind: saved.kind,
            },
            {
              baseUrl: "https://images.example.com",
              keySet: true,
              keyUnreadable: false,
              kind: "anthropic",
            }
          );
        }
      }).pipe(Effect.provide(assistantTest()))
    );

    it.effect(
      "keeps the stored key while the address stays the same, and asks for it otherwise",
      () =>
        Effect.gen(function* kept() {
          const workspaceId = yield* freshWorkspace;
          const assistant = yield* WritingAssistant;

          const noKey = yield* assistant
            .saveTextProvider(admin(workspaceId), {
              baseUrl: "https://images.example.com/v1",
              kind: "openai-compatible",
              model: "synthetic-text-model",
            })
            .pipe(Effect.flip);

          assert.strictEqual(noKey._tag, "TextProviderKeyRequired");

          yield* bringProvider(workspaceId);

          yield* assistant.saveTextProvider(admin(workspaceId), {
            baseUrl: "https://images.example.com/v1",
            kind: "openai-compatible",
            model: "synthetic-text-model-2",
          });

          yield* askOwn(workspaceId, ownAnswer("Hi."));

          assert.deepInclude((yield* ownCalls)[0], {
            apiKey: syntheticKey,
            model: "synthetic-text-model-2",
          });

          const moved = yield* assistant
            .saveTextProvider(admin(workspaceId), {
              baseUrl: "https://other-images.example.com/v1",
              kind: "openai-compatible",
              model: "synthetic-text-model",
            })
            .pipe(Effect.flip);

          assert.strictEqual(moved._tag, "TextProviderKeyRequired");
        }).pipe(Effect.provide(assistantTest()))
    );

    it.effect(
      "refuses an address Peal sends nothing to, and saves nothing",
      () =>
        Effect.gen(function* refusedAddress() {
          const workspaceId = yield* freshWorkspace;
          const assistant = yield* WritingAssistant;

          const refusals = yield* Effect.forEach(
            [
              "http://images.example.com/v1",
              "https://images.internal.example/v1",
              "https://unknown.example/v1",
              "https://user:secret@images.example.com/v1",
            ],
            (baseUrl) =>
              assistant
                .saveTextProvider(admin(workspaceId), {
                  apiKey: syntheticKey,
                  baseUrl,
                  kind: "openai-compatible",
                  model: "synthetic-text-model",
                })
                .pipe(
                  Effect.flip,
                  Effect.map((refusal) =>
                    "reason" in refusal
                      ? `${refusal._tag} ${refusal.reason}`
                      : refusal._tag
                  )
                )
          );

          assert.deepStrictEqual(refusals, [
            "ProviderAddressRejected notHttps",
            "ProviderAddressNotPublic notPublic",
            "ProviderAddressNotPublic unknownHost",
            "ProviderAddressRejected credentials",
          ]);
          assert.isTrue(
            Option.isNone(yield* assistant.textProvider(admin(workspaceId)))
          );
        }).pipe(Effect.provide(assistantTest()))
    );

    it.effect(
      "keeps the day's counts once the provider is removed, until the workspace goes",
      () =>
        Effect.gen(function* kept() {
          const workspaceId = yield* freshWorkspace;
          const sql = yield* SqlClient.SqlClient;

          yield* bringProvider(workspaceId);
          yield* askOwn(workspaceId, ownAnswer("Hi."));
          yield* WritingAssistant.use((assistant) =>
            assistant.removeTextProvider(admin(workspaceId))
          );

          const [provider] = yield* sql<{
            readonly count: number;
          }>`SELECT count(*)::int AS count FROM assistant.text_providers WHERE workspace_id = ${workspaceId}`;
          const [counted] = yield* sql<{
            readonly requests: number;
          }>`SELECT requests FROM assistant.own_text_days WHERE workspace_id = ${workspaceId}`;

          // Removing and saving again starts no new day.
          assert.strictEqual(provider?.count, 0);
          assert.strictEqual(counted?.requests, 1);
        }).pipe(Effect.provide(assistantTest()))
    );

    it.effect("removes it, and the server's model writes again", () =>
      Effect.gen(function* removed() {
        const workspaceId = yield* freshWorkspace;

        yield* bringProvider(workspaceId);
        yield* WritingAssistant.use((assistant) =>
          assistant.removeTextProvider(admin(workspaceId))
        );

        assert.deepInclude(yield* statusOf(workspaceId), {
          available: true,
          source: "server",
        });

        yield* FakeModel.use((model) =>
          model.replyWith({ _tag: "text", text: '{"text":"From Peal."}' })
        );

        const suggestion = yield* WritingAssistant.use((assistant) =>
          assistant.suggest(actorIn(workspaceId), rewrite)
        );

        assert.deepStrictEqual(suggestion, {
          _tag: "text",
          text: "From Peal.",
        });
        assert.lengthOf(yield* ownCalls, 0);
        assert.strictEqual((yield* statusOf(workspaceId)).remaining, 2);
      }).pipe(Effect.provide(assistantTest()))
    );

    it.effect(
      "tests the saved provider with one short request, counted as its own",
      () =>
        Effect.gen(function* tested() {
          const workspaceId = yield* freshWorkspace;
          const assistant = yield* WritingAssistant;
          const sql = yield* SqlClient.SqlClient;

          const none = yield* assistant
            .testTextProvider(admin(workspaceId))
            .pipe(Effect.flip);

          assert.strictEqual(none._tag, "TextProviderNotSet");

          yield* bringProvider(workspaceId);
          yield* FakeOwnWritingModel.use((model) =>
            model.replyWith(ownAnswer("It works."))
          );
          yield* assistant.testTextProvider(admin(workspaceId));

          const [call] = yield* ownCalls;

          assert.strictEqual(call?.apiKey, syntheticKey);

          yield* FakeOwnWritingModel.use((model) =>
            model.replyWith({ _tag: "settingsRefused", status: 403 })
          );

          const refused = yield* assistant
            .testTextProvider(admin(workspaceId))
            .pipe(Effect.flip);

          assert.deepInclude(refused, {
            _tag: "TextProviderRefused",
            status: 403,
          });

          const [counted] = yield* sql<{
            readonly requests: number;
          }>`SELECT requests FROM assistant.own_text_days WHERE workspace_id = ${workspaceId}`;

          assert.strictEqual(counted?.requests, 2);
          assert.lengthOf(yield* peals, 0);
          assert.strictEqual((yield* statusOf(workspaceId)).remaining, 3);
        }).pipe(Effect.provide(assistantTest()))
    );
  }
);
