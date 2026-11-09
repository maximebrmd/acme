import { assert, layer } from "@effect/vitest";
import { Api } from "peal-contract";
import { Effect, Layer } from "effect";
import { Cookies, HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";

import { StaffApiLive } from "#staff/container.ts";
import {
  memberId,
  memoryStaff,
  profileOf,
  staffId,
} from "#test/staff/support.ts";
import {
  anonymousSecurityTest,
  staffSecurityTest,
} from "#workspace/api/security.ts";

// The staff console's endpoints on its use cases, with ports in memory.
// StaffAccess, which the integration tests run for real, is either staff's
// or nobody's.

const accounts = [profileOf(staffId, { staff: true }), profileOf(memberId)];

const handlersWith = <E, R>(
  security: Layer.Layer<Layer.Success<typeof anonymousSecurityTest>, E, R>
) =>
  Layer.mergeAll(
    StaffApiLive.pipe(
      Layer.provideMerge(security),
      Layer.provide(memoryStaff(accounts))
    ),
    HttpServer.layerServices
  );

const makeClient = HttpApiTest.groups(Api, ["staff"]);

const reason = { reason: "Synthetic support ticket" };

const statusOf = <A, E extends { readonly _tag: string }, R>(
  request: Effect.Effect<A, E, R>
) =>
  request.pipe(
    Effect.match({ onFailure: ({ _tag }) => _tag, onSuccess: () => "ok" })
  );

layer(handlersWith(anonymousSecurityTest))(
  "the staff endpoints, to anyone but staff",
  (it) => {
    it.effect("answer NotFound, every one of them", () =>
      Effect.gen(function* refuses() {
        const client = yield* makeClient;
        const params = { userId: memberId };

        const statuses = [
          statusOf(client.staff.session()),
          statusOf(client.staff.system()),
          statusOf(client.staff.users({ query: {} })),
          statusOf(client.staff.user({ params })),
          statusOf(client.staff.workspaces({ query: {} })),
          statusOf(
            client.staff.workspace({ params: { workspaceId: memberId } })
          ),
          statusOf(client.staff.audit({ query: {} })),
          statusOf(
            client.staff.ban({
              params,
              payload: { ...reason, expiresAt: null },
            })
          ),
          statusOf(client.staff.unban({ params, payload: reason })),
          statusOf(client.staff.revokeSessions({ params, payload: reason })),
          statusOf(
            client.staff.resendVerification({ params, payload: reason })
          ),
          statusOf(client.staff.impersonate({ params, payload: reason })),
        ];

        for (const status of statuses) {
          assert.strictEqual(yield* status, "NotFound");
        }
      })
    );
  }
);

layer(handlersWith(staffSecurityTest(staffId)))(
  "the staff endpoints, to staff",
  (it) => {
    it.effect("tell staff who they are", () =>
      Effect.gen(function* session() {
        const client = yield* makeClient;

        const me = yield* client.staff.session();

        assert.strictEqual(me.userId, staffId);
      })
    );

    it.effect("answer an id that names no account with UserNotFound", () =>
      Effect.gen(function* missing() {
        const client = yield* makeClient;

        for (const userId of [
          "not-an-id",
          "11111111-2222-4333-8444-555555555555",
        ]) {
          assert.strictEqual(
            yield* statusOf(client.staff.user({ params: { userId } })),
            "UserNotFound"
          );
          assert.strictEqual(
            yield* statusOf(
              client.staff.unban({ params: { userId }, payload: reason })
            ),
            "UserNotFound"
          );
        }
      })
    );

    it.effect("answer an action that does not apply with its reason", () =>
      Effect.gen(function* refused() {
        const client = yield* makeClient;

        const failure = yield* client.staff
          .ban({
            params: { userId: staffId },
            payload: { ...reason, expiresAt: null },
          })
          .pipe(Effect.flip);

        assert.deepInclude(failure, {
          _tag: "StaffActionRefused",
          reason: "self",
        });
      })
    );

    it.effect("sign the browser in as the account they impersonate", () =>
      Effect.gen(function* impersonates() {
        const client = yield* makeClient;

        const response = yield* client.staff.impersonate({
          params: { userId: memberId },
          payload: reason,
          responseMode: "response-only",
        });

        assert.strictEqual(response.status, 204);
        assert.deepInclude(Cookies.toRecord(response.cookies), {
          "peal.admin_session": "synthetic-staff-session",
          "peal.session_token": "synthetic-impersonation",
        });
      })
    );

    it.effect("list what they did, newest first", () =>
      Effect.gen(function* audit() {
        const client = yield* makeClient;
        const params = { userId: memberId };

        yield* client.staff.revokeSessions({ params, payload: reason });
        yield* client.staff.unban({ params, payload: reason });

        const page = yield* client.staff.audit({
          query: { targetId: memberId },
        });

        assert.deepStrictEqual(
          page.items
            .slice(0, 2)
            .map(({ action, reason: why, staffId: who }) => ({
              action,
              reason: why,
              staffId: who,
            })),
          [
            { action: "unban", reason: reason.reason, staffId },
            { action: "revokeSessions", reason: reason.reason, staffId },
          ]
        );
      })
    );
  }
);
