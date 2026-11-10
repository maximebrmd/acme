import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import {
  Api,
  AssistantFailed,
  AssistantInputRejected,
  AssistantQuotaExceeded,
  AssistantUnavailable,
  Forbidden,
} from "peal-contract";
import type { Member, SuggestionRequest } from "peal-contract";

import { AssistantApiLive } from "#assistant/container.ts";
import type { Permission } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  answer,
  assistantTest,
  DatabaseTest,
  FakeModel,
  freshWorkspace,
  rawAnswer,
} from "#test/assistant/support.ts";
import { memberOf } from "#test/channels/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The assistant's endpoints on its real use cases, Postgres and the fake
// model. Each request acts as a member, as the WorkspaceAccess middleware
// would.
const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["assistant"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        AssistantApiLive.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const as = (
  workspaceId: WorkspaceId,
  permissions: readonly Permission[] = permissionsFor("editor")
) => clientAs(memberOf(workspaceId, permissions));

const translate: SuggestionRequest = {
  action: { _tag: "translate", language: "de" },
  text: "Our spring sale starts today.",
};

layer(DatabaseTest)("the assistant endpoints", (it) => {
  it.effect("suggest a text, and count it toward the day", () =>
    Effect.gen(function* suggests() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId);
      const params = { workspaceId };

      yield* FakeModel.use((model) =>
        model.replyWith(
          answer({ text: "Unser Frühlingsverkauf beginnt heute." })
        )
      );

      const before = yield* client.assistant.status({ params });

      assert.deepStrictEqual(
        { ...before, resetsAt: DateTime.formatIso(before.resetsAt) },
        {
          available: true,
          dailyLimit: 2,
          maxTextLength: 5000,
          remaining: 2,
          resetsAt: "1970-01-02T00:00:00.000Z",
        }
      );

      const suggestion = yield* client.assistant.suggest({
        params,
        payload: translate,
      });

      assert.deepStrictEqual(suggestion, {
        _tag: "text",
        text: "Unser Frühlingsverkauf beginnt heute.",
      });

      assert.strictEqual(
        (yield* client.assistant.status({ params })).remaining,
        1
      );
    }).pipe(Effect.provide(assistantTest({ dailyRequests: 2 })))
  );

  it.effect("answer a typed error past the quota", () =>
    Effect.gen(function* quota() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId);
      const params = { workspaceId };

      yield* client.assistant.suggest({ params, payload: translate });

      const refused = yield* client.assistant
        .suggest({ params, payload: translate })
        .pipe(Effect.flip);

      // With the plan that allows more, and where to order it.
      assert.deepStrictEqual(
        refused instanceof AssistantQuotaExceeded
          ? {
              billingUrl: refused.billingUrl,
              dailyLimit: refused.dailyLimit,
              plan: refused.plan,
              planWithRoom: refused.planWithRoom,
            }
          : refused,
        {
          billingUrl: `http://localhost:3001/app/${workspaceId}/billing`,
          dailyLimit: 1,
          plan: "free",
          planWithRoom: "starter",
        }
      );
    }).pipe(Effect.provide(assistantTest({ dailyRequests: 1 })))
  );

  it.effect("say the assistant is off when no model is configured", () =>
    Effect.gen(function* off() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId);
      const params = { workspaceId };

      assert.isFalse((yield* client.assistant.status({ params })).available);

      const refused = yield* client.assistant
        .suggest({ params, payload: translate })
        .pipe(Effect.flip);

      assert.instanceOf(refused, AssistantUnavailable);
    }).pipe(Effect.provide(assistantTest({ model: "off" })))
  );

  it.effect("refuse a blank or overlong text", () =>
    Effect.gen(function* input() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId);
      const params = { workspaceId };

      const blank = yield* client.assistant
        .suggest({ params, payload: { ...translate, text: "   " } })
        .pipe(Effect.flip);

      const long = yield* client.assistant
        .suggest({ params, payload: { ...translate, text: "a".repeat(5001) } })
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        [blank, long].map((refusal) =>
          refusal instanceof AssistantInputRejected
            ? { maxLength: refusal.maxLength, reason: refusal.reason }
            : refusal
        ),
        [
          { maxLength: 5000, reason: "empty" },
          { maxLength: 5000, reason: "tooLong" },
        ]
      );
    }).pipe(Effect.provide(assistantTest()))
  );

  it.effect("say when the model's answer cannot be used", () =>
    Effect.gen(function* invalid() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId);

      yield* FakeModel.use((model) =>
        model.replyWith(rawAnswer("I will not answer in JSON."))
      );

      const refused = yield* client.assistant
        .suggest({ params: { workspaceId }, payload: translate })
        .pipe(Effect.flip);

      assert.instanceOf(refused, AssistantFailed);
      assert.strictEqual(
        refused instanceof AssistantFailed ? refused.reason : null,
        "invalidAnswer"
      );
    }).pipe(Effect.provide(assistantTest()))
  );

  it.effect("are forbidden to members without assistant:use", () =>
    Effect.gen(function* forbidden() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId, permissionsFor("viewer"));
      const params = { workspaceId };

      const status = yield* client.assistant
        .status({ params })
        .pipe(Effect.flip);

      const suggest = yield* client.assistant
        .suggest({ params, payload: translate })
        .pipe(Effect.flip);

      assert.instanceOf(status, Forbidden);
      assert.instanceOf(suggest, Forbidden);
    }).pipe(Effect.provide(assistantTest()))
  );
});
