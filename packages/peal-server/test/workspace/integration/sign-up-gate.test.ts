// `PEAL_SIGN_UP`: on an open server anyone signs up; by invitation, only an
// address with a pending invitation, refused the same way whatever the
// address. The first account of an empty server is tested on the gate's
// port (test/workspace/application/sign-up-gate.test.ts): the database
// here may hold other suites' accounts.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { MigratedSqlLive, newEmail, password, TestApp } from "./harness.ts";

const SignedUpSchema = Schema.Struct({
  token: Schema.NullOr(Schema.String),
  user: Schema.Struct({ email: Schema.String, id: Schema.String }),
});

const signUp = (email: string) =>
  TestApp.use((app) =>
    app.request("/api/auth/sign-up/email", {
      body: { email, locale: "en", name: "Ada Lovelace", password },
    })
  );

const hour = 3_600_000;
const week = 7 * 24 * hour;

type InvitationStatus = "accepted" | "canceled" | "pending" | "rejected";

// A workspace, its owner and an invitation to the address, written as
// Better Auth writes them (the address lower-cased), straight in the
// database: on a server by invitation, nobody signs up to make them.
const invite = Effect.fn("invite")(function* invite(
  email: string,
  {
    expired = false,
    status = "pending",
  }: { readonly expired?: boolean; readonly status?: InvitationStatus } = {}
) {
  const sql = yield* SqlClient.SqlClient;
  const ownerId = randomUUID();
  const workspaceId = randomUUID();

  yield* sql`
    INSERT INTO auth."user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${ownerId}, 'Inviting owner', ${newEmail("inviter")}, true, now(), now())`;
  yield* sql`
    INSERT INTO auth.organization (id, name, slug, created_at)
    VALUES (${workspaceId}, 'Invited Notes', ${`invited-${workspaceId}`}, now())`;
  yield* sql`
    INSERT INTO auth.member (id, organization_id, user_id, role, created_at)
    VALUES (${randomUUID()}, ${workspaceId}, ${ownerId}, 'owner', now())`;
  yield* sql`
    INSERT INTO auth.invitation (id, organization_id, email, role, status, expires_at, created_at, inviter_id)
    VALUES (
      ${randomUUID()}, ${workspaceId}, ${email.toLowerCase()}, 'editor', ${status},
      ${new Date(Date.now() + (expired ? -hour : week))},
      now(), ${ownerId}
    )`;
});

const refusedBody = {
  code: "SIGN_UP_BY_INVITATION",
  message:
    "Accounts on this server are made by invitation: ask a workspace to invite this address",
};

const settings = { timeout: "180 seconds" } as const;

layer(
  Layer.mergeAll(
    TestApp.layerWith({ PEAL_SIGN_UP: "invitation" }),
    MigratedSqlLive
  ),
  settings
)("a server where accounts are made by invitation", (it) => {
  it.effect("refuses an address without an invitation, saying why", () =>
    Effect.gen(function* uninvited() {
      // Another workspace's invitation makes no difference.
      yield* invite(newEmail("someone-else"));

      const refused = yield* signUp(newEmail("uninvited"));

      assert.strictEqual(refused.status, 403);
      assert.deepStrictEqual(refused.body, refusedBody);
    })
  );

  it.effect("answers two uninvited addresses alike", () =>
    Effect.gen(function* alike() {
      const first = yield* signUp(newEmail("first-stranger"));
      const second = yield* signUp(newEmail("second-stranger"));

      assert.strictEqual(first.status, second.status);
      assert.deepStrictEqual(first.body, second.body);
    })
  );

  it.effect("answers an uninvited address with an account alike", () =>
    Effect.gen(function* existing() {
      const email = newEmail("has-account");
      const sql = yield* SqlClient.SqlClient;

      yield* sql`
        INSERT INTO auth."user" (id, name, email, email_verified, created_at, updated_at)
        VALUES (${randomUUID()}, 'Has an account', ${email}, true, now(), now())`;

      const refused = yield* signUp(email);

      assert.strictEqual(refused.status, 403);
      assert.deepStrictEqual(refused.body, refusedBody);
    })
  );

  it.effect("signs up an invited address, however it is written", () =>
    Effect.gen(function* invited() {
      const email = newEmail("invited");

      yield* invite(email);

      const created = yield* signUp(email.toUpperCase());

      assert.strictEqual(created.status, 200);

      const { user } = yield* Schema.decodeUnknownEffect(SignedUpSchema)(
        created.body
      );

      assert.strictEqual(user.email, email.toLowerCase());
    })
  );

  it.effect("refuses an invitation cancelled, answered or expired", () =>
    Effect.gen(function* notPending() {
      for (const options of [
        { status: "canceled" as const },
        { status: "accepted" as const },
        { status: "rejected" as const },
        { expired: true },
      ]) {
        const email = newEmail("not-pending");

        yield* invite(email, options);

        const refused = yield* signUp(email);

        assert.strictEqual(refused.status, 403);
        assert.deepStrictEqual(refused.body, refusedBody);
      }
    })
  );

  it.effect(
    "answers an invited address that has an account as an open server does",
    () =>
      Effect.gen(function* invitedWithAccount() {
        const email = newEmail("invited-member");

        yield* invite(email);

        const first = yield* signUp(email);
        const again = yield* signUp(email);

        assert.strictEqual(first.status, 200);
        assert.strictEqual(again.status, 200);

        // A made-up user, as Better Auth answers a known address: no
        // session, and not the account's id.
        const made = yield* Schema.decodeUnknownEffect(SignedUpSchema)(
          first.body
        );

        const madeUp = yield* Schema.decodeUnknownEffect(SignedUpSchema)(
          again.body
        );

        assert.isNull(madeUp.token);
        assert.strictEqual(madeUp.user.email, email);
        assert.notStrictEqual(madeUp.user.id, made.user.id);
      })
  );
});

layer(TestApp.layerWith({ PEAL_SIGN_UP: "open" }), settings)(
  "an open server",
  (it) => {
    it.effect("signs anyone up", () =>
      Effect.gen(function* open() {
        const created = yield* signUp(newEmail("anyone"));

        assert.strictEqual(created.status, 200);
      })
    );
  }
);
