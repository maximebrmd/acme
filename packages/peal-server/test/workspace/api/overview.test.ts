import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiError, HttpApiTest } from "effect/http-api";
import {
  Api,
  Forbidden,
  InvalidTimeRange,
  Unauthenticated,
} from "peal-contract";
import type { Member, Principal } from "peal-contract";

import {
  alpha,
  at,
  bravo,
  noCalls,
  overviewOver,
  userId,
} from "#test/workspace/fakes/overview-fakes.ts";
import type { Place } from "#test/workspace/fakes/overview-fakes.ts";
import {
  anonymousSecurityTest,
  securityTest,
} from "#workspace/api/security.ts";
import { OverviewApiLive } from "#workspace/container.ts";

// The endpoints across a person's workspaces, on the use case over a
// directory and sources in memory. Each request authenticates as a
// principal, as the Authentication middleware would.

const places: readonly Place[] = [
  { id: alpha, name: "Alpha", role: "viewer" },
  { id: bravo, name: "Bravo", role: "owner", twoStepRequired: true },
];

const clientWith = <E, R>(
  security: Layer.Layer<Layer.Success<typeof anonymousSecurityTest>, E, R>
) =>
  Effect.gen(function* client() {
    const calls = yield* noCalls();

    return yield* HttpApiTest.groups(Api, ["overview"]).pipe(
      Effect.provide(
        Layer.mergeAll(
          OverviewApiLive.pipe(
            Layer.provide(overviewOver(places, calls)),
            Layer.provideMerge(security)
          ),
          HttpServer.layerServices
        )
      )
    );
  });

const as = (principal: Principal) => {
  const member: Member = {
    permissions: [],
    principal,
    workspaceId: alpha,
  };

  return clientWith(securityTest(member));
};

const person: Principal = { _tag: "user", impersonatedBy: null, userId };

const range = {
  from: at("2026-11-12T00:00:00Z"),
  to: at("2026-11-26T00:00:00Z"),
};

describe("the overview endpoints", () => {
  it.effect(
    "answer each workspace with the sections the role reads, null elsewhere, and a refused one bare",
    () =>
      Effect.gen(function* answers() {
        const client = yield* as(person);
        const overview = yield* client.overview.get({ query: {} });

        assert.deepStrictEqual(
          overview.workspaces.map(({ id, refused }) => ({ id, refused })),
          [
            { id: alpha, refused: null },
            { id: bravo, refused: "twoStepRequired" },
          ]
        );

        const [viewer, refused] = overview.workspaces;

        assert.isDefined(viewer);
        assert.isDefined(refused);
        assert.strictEqual(viewer.posts?.mayApprove, false);
        assert.strictEqual(viewer.overPlan, false);
        assert.isNull(refused.posts);
        assert.isNull(refused.channels);
        assert.isNull(refused.inbox);
        assert.isNull(refused.overPlan);
        assert.isNull(overview.nextCursor);
      })
  );

  it.effect("refuse API keys and partner keys, which belong to no one", () =>
    Effect.gen(function* keys() {
      const key = yield* as({
        _tag: "apiKey",
        apiKeyId: "synthetic-key",
        permissions: ["post:read"],
        workspaceId: alpha,
      });

      const refused = yield* key.overview.get({ query: {} }).pipe(Effect.flip);

      assert.instanceOf(refused, Forbidden);
      assert.strictEqual(refused.reason, "personRequired");

      const partner = yield* as({
        _tag: "partnerKey",
        partnerId: "synthetic-partner",
        partnerKeyId: "synthetic-partner-key",
        permissions: ["post:read"],
        scopes: ["workspaces:read"],
      });

      const agenda = yield* partner.overview
        .agenda({ query: range })
        .pipe(Effect.flip);

      assert.instanceOf(agenda, Forbidden);
    })
  );

  it.effect("refuse an OAuth token bound to one workspace", () =>
    Effect.gen(function* bound() {
      const client = yield* as({
        ...person,
        oauth: {
          clientId: "synthetic-mcp-client",
          scopes: ["workspace:read"],
          workspaceId: alpha,
        },
      });

      const refused = yield* client.overview
        .get({ query: {} })
        .pipe(Effect.flip);

      assert.instanceOf(refused, Forbidden);
      assert.strictEqual(refused.reason, "personRequired");
    })
  );

  it.effect("answer 401 without credentials", () =>
    Effect.gen(function* anonymous() {
      const client = yield* clientWith(anonymousSecurityTest);

      const refused = yield* client.overview
        .get({ query: {} })
        .pipe(Effect.flip);

      assert.instanceOf(refused, Unauthenticated);
    })
  );

  it.effect("answer a bad request to a cursor no page gave", () =>
    Effect.gen(function* badCursor() {
      const client = yield* as(person);

      const refused = yield* client.overview
        .get({ query: { cursor: "nothing-a-page-gave" } })
        .pipe(Effect.flip);

      assert.instanceOf(refused, HttpApiError.BadRequest);
    })
  );

  describe("the agenda", () => {
    it.effect("refuses a range past 31 days", () =>
      Effect.gen(function* tooLong() {
        const client = yield* as(person);

        const refused = yield* client.overview
          .agenda({
            query: {
              from: at("2026-11-01T00:00:00Z"),
              to: at("2026-12-03T00:00:00Z"),
            },
          })
          .pipe(Effect.flip);

        assert.instanceOf(refused, InvalidTimeRange);
      })
    );

    it.effect("refuses workspace ids that cannot be a workspace's", () =>
      Effect.gen(function* badIds() {
        const client = yield* as(person);

        const refused = yield* client.overview
          .agenda({ query: { ...range, workspaceIds: `${alpha},not-an-id` } })
          .pipe(Effect.flip);

        assert.instanceOf(refused, HttpApiError.BadRequest);
      })
    );

    it.effect("answers an empty page where nothing is scheduled", () =>
      Effect.gen(function* empty() {
        const client = yield* as(person);

        const page = yield* client.overview.agenda({
          query: { ...range, workspaceIds: ` ${alpha} , ${bravo}` },
        });

        assert.deepStrictEqual(page, { items: [], nextCursor: null });
      })
    );
  });
});
