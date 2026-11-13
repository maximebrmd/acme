// The writing assistant on a server that bills: the server's model
// claims the billing account's meters, a workspace's own provider none.
import { assert, layer } from "@effect/vitest";
import { Effect, Fiber, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { WritingAssistant } from "#assistant/application/writing-assistant.ts";
import type { AssistantRequest } from "#assistant/application/writing-assistant.ts";
import { answerTimeout } from "#assistant/infrastructure/language-model-writing-model.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  actorIn,
  answer,
  assistantTest,
  DatabaseTest,
  FakeModel,
  FakeOwnWritingModel,
  freshWorkspace,
  rawAnswer,
  silence,
} from "#test/assistant/support.ts";
import { FakeMetersLedger, fakeMeters } from "#test/shared/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const rewrite: AssistantRequest = {
  action: { _tag: "rewrite", tone: "professional" },
  text: "we shipped it!! come see",
};

const ask = (workspaceId: WorkspaceId) =>
  WritingAssistant.use((assistant) =>
    assistant.suggest(actorIn(workspaceId), rewrite)
  );

const ledger = FakeMetersLedger.use(Ref.get);

const prompts = FakeModel.use((model) => model.prompts);

// A billing account that pays, with room for `allowed` requests a month.
const paying = (allowed: number) =>
  assistantTest({
    meters: fakeMeters({ allowed: Option.some(allowed) }),
    metered: true,
  });

// A billing account without a payment method: none of the server's model.
const freeTier = assistantTest({
  meters: fakeMeters({ allowed: Option.some(0), paymentMethod: false }),
  metered: true,
});

layer(DatabaseTest, { timeout: "60 seconds" })(
  "the writing assistant on a server that bills",
  (it) => {
    it.effect(
      "claims one of the month's requests, and tells the month in its status",
      () =>
        Effect.gen(function* claimsOne() {
          const workspaceId = yield* freshWorkspace;

          yield* FakeModel.use((model) =>
            model.replyWith(answer({ text: "We shipped it." }))
          );

          const suggestion = yield* ask(workspaceId);

          assert.deepStrictEqual(suggestion, {
            _tag: "text",
            text: "We shipped it.",
          });

          const { claims, givenBack } = yield* ledger;

          assert.deepStrictEqual(
            claims.map(({ meter, units }) => [meter, units]),
            [["assistantRequests", 1]]
          );
          assert.lengthOf(givenBack, 0);

          const status = yield* WritingAssistant.use((assistant) =>
            assistant.status(actorIn(workspaceId))
          );

          assert.deepInclude(status, {
            available: true,
            dailyLimit: 2,
            reason: null,
            remaining: 1,
            source: "server",
          });
          assert.deepInclude(status.month, { most: 2, used: 1 });
        }).pipe(Effect.provide(paying(2)))
    );

    it.effect(
      "refuses a billing account without a payment method before the model is asked",
      () =>
        Effect.gen(function* refused() {
          const workspaceId = yield* freshWorkspace;
          const refusal = yield* ask(workspaceId).pipe(Effect.flip);

          assert.deepInclude(refusal, {
            _tag: "AllowanceReached",
            allowed: 0,
            meter: "assistantRequests",
            reason: "paymentMethodRequired",
          });
          assert.lengthOf(yield* prompts, 0);

          const status = yield* WritingAssistant.use((assistant) =>
            assistant.status(actorIn(workspaceId))
          );

          assert.deepInclude(status, {
            available: false,
            reason: "paymentMethod",
            remaining: 0,
            source: null,
          });
        }).pipe(Effect.provide(freeTier))
    );

    it.effect("gives the request back when the answer is unusable", () =>
      Effect.gen(function* unusable() {
        const workspaceId = yield* freshWorkspace;

        yield* FakeModel.use((model) => model.replyWith(rawAnswer("{")));

        const refusal = yield* ask(workspaceId).pipe(Effect.flip);

        assert.notStrictEqual(refusal._tag, "AllowanceReached");

        const { claims, givenBack, used } = yield* ledger;

        assert.lengthOf(claims, 1);
        assert.lengthOf(givenBack, 1);
        assert.strictEqual(used.get("assistantRequests"), 0);
      }).pipe(Effect.provide(paying(2)))
    );

    it.effect("gives the request back when the model times out", () =>
      Effect.gen(function* timesOut() {
        const workspaceId = yield* freshWorkspace;

        yield* FakeModel.use((model) => model.replyWith(silence));

        const asking = yield* ask(workspaceId).pipe(
          Effect.flip,
          Effect.forkChild
        );

        for (let round = 0; round < 500; round += 1) {
          if ((yield* prompts).length > 0) {
            break;
          }

          yield* TestClock.withLive(Effect.sleep("10 millis"));
        }

        yield* TestClock.withLive(Effect.sleep("10 millis"));
        yield* TestClock.adjust(answerTimeout);

        const refusal = yield* Fiber.join(asking);

        assert.deepInclude(refusal, {
          _tag: "WritingFailed",
          reason: "timedOut",
        });

        const { givenBack, used } = yield* ledger;

        assert.lengthOf(givenBack, 1);
        assert.strictEqual(used.get("assistantRequests"), 0);
      }).pipe(Effect.provide(paying(2)))
    );

    it.effect(
      "writes with the workspace's own provider without a payment method, claiming nothing",
      () =>
        Effect.gen(function* own() {
          const workspaceId = yield* freshWorkspace;
          const assistant = yield* WritingAssistant;

          yield* assistant.saveTextProvider(
            actorIn(workspaceId, permissionsFor("admin")),
            {
              apiKey: "synthetic-workspace-text-key",
              baseUrl: "https://images.example.com/v1/",
              kind: "openai-compatible",
              model: "synthetic-text-model",
            }
          );
          yield* FakeOwnWritingModel.use((model) =>
            model.replyWith({ _tag: "answer", value: { text: "Ours." } })
          );

          const suggestion = yield* ask(workspaceId);

          assert.deepStrictEqual(suggestion, { _tag: "text", text: "Ours." });
          assert.lengthOf((yield* ledger).claims, 0);

          const status = yield* assistant.status(actorIn(workspaceId));

          assert.deepInclude(status, {
            available: true,
            month: null,
            reason: null,
            source: "workspace",
          });
        }).pipe(Effect.provide(freeTier))
    );
  }
);
