// What the activity log keeps of ads, through the whole server: a boost
// asked for, paused or stopped, and a decision about what an account may
// spend, are requests that ask for a change, kept as metadata; a quote
// checks and changes nothing, and leaves nothing; and no event holds an
// amount, an audience or a party's name.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { ActivityPageSchema } from "peal-contract";

import {
  apiKeyOf,
  bodyOf,
  signedUpUnconfirmed,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";

const PageJsonSchema = Schema.toCodecJson(ActivityPageSchema);

// Ids of nothing the workspace has: each request is refused, and kept.
const accountId = "00000000-0000-7000-8000-00000000ad01";
const boostId = "00000000-0000-7000-8000-00000000ad02";

const party = "A synthetic beneficiary the log must never hold";

const boost = {
  accountId,
  audience: { ageMax: 65, ageMin: 18, countries: ["FR"] },
  beneficiary: party,
  budget: { amount: 4321, kind: "total" },
  channelId: "00000000-0000-7000-8000-00000000ad03",
  currency: "EUR",
  endsAt: "2046-05-13T10:00:00.000Z",
  payer: party,
  postId: "00000000-0000-7000-8000-00000000ad04",
  specialAdCategory: "none",
};

layer(Layer.mergeAll(TestApp.layerWith(unconfirmedEmails)), {
  excludeTestServices: true,
  timeout: "180 seconds",
})("the activity log, for ads", (it) => {
  it.effect(
    "keeps who asked for a boost, paused or stopped one, or decided what an account spends: never an amount, and nothing of a quote",
    () =>
      Effect.gen(function* recorded() {
        const app = yield* TestApp;
        const owner = yield* signedUpUnconfirmed("ads-activity");
        const workspaceId = yield* workspaceOf(owner, "Ads activity");
        const base = `/api/workspaces/${workspaceId}/ads`;

        const desk = yield* apiKeyOf(owner, workspaceId, [
          "ads:read",
          "ads:manage",
          "ads:spend",
        ]);

        const asked = (id: string) => ({
          authorization: `Bearer ${desk.key}`,
          "x-request-id": id,
        });

        const quoted = yield* app.request(`${base}/boosts/quote`, {
          body: boost,
          headers: asked("ads-activity-0001"),
        });

        const requested = yield* app.request(`${base}/boosts`, {
          body: boost,
          headers: {
            ...asked("ads-activity-0002"),
            "idempotency-key": "ads-activity-key",
          },
        });

        const paused = yield* app.request(`${base}/boosts/${boostId}/pause`, {
          headers: asked("ads-activity-0003"),
          method: "POST",
        });

        // The owner, in person, as only an owner decides this.
        const decided = yield* app.request(
          `${base}/accounts/${accountId}/spending`,
          {
            body: {
              enabled: true,
              monthlyCeiling: { amount: 98_765, currency: "EUR" },
            },
            headers: {
              cookie: owner.cookies,
              "x-request-id": "ads-activity-0004",
            },
            method: "PUT",
          }
        );

        // Refused, as nothing here exists: kept all the same.
        for (const reply of [quoted, requested, paused, decided]) {
          assert.isAtLeast(reply.status, 400);
        }

        const log = yield* app
          .request(`/api/workspaces/${workspaceId}/activity`, {
            headers: { cookie: owner.cookies },
          })
          .pipe(Effect.flatMap((reply) => bodyOf(PageJsonSchema, reply)));

        const ads = log.items.filter(({ operation }) =>
          operation.startsWith("ads.")
        );

        assert.deepStrictEqual(
          ads.map(({ operation, requestId }) => [operation, requestId]),
          [
            ["ads.setSpending", "ads-activity-0004"],
            ["ads.pauseBoost", "ads-activity-0003"],
            ["ads.createBoost", "ads-activity-0002"],
          ]
        );

        // The ids the paths named, and nothing the bodies held.
        assert.deepStrictEqual(
          ads.map(({ objectIds }) => objectIds),
          [{ accountId }, { boostId }, {}]
        );

        const kept = JSON.stringify(ads);

        for (const held of [party, "4321", "98765", "FR"]) {
          assert.notInclude(kept, held);
        }
      })
  );
});
