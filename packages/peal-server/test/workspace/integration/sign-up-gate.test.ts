// `PEAL_SIGN_UP`: on an open server anyone signs up; by invitation, only
// whoever names a pending invitation (`x-peal-invitation`) with the address
// it went to, refused the same way whatever the address. The first account of an empty server is tested on the gate's
// port (test/workspace/application/sign-up-gate.test.ts): the database
// here may hold other suites' accounts.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { CaptchaSchema, signUpInvitationHeader } from "peal-contract";

import { MigratedSqlLive, newEmail, password, TestApp } from "./harness.ts";
import type { Reply } from "./harness.ts";

const SignedUpSchema = Schema.Struct({
  token: Schema.NullOr(Schema.String),
  user: Schema.Struct({ email: Schema.String, id: Schema.String }),
});

const signUp = (email: string, invitationId?: string) =>
  TestApp.use((app) =>
    app.request("/api/auth/sign-up/email", {
      body: { email, locale: "en", name: "Ada Lovelace", password },
      headers:
        invitationId === undefined
          ? {}
          : { [signUpInvitationHeader]: invitationId },
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
  const invitationId = randomUUID();
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
      ${invitationId}, ${workspaceId}, ${email.toLowerCase()}, 'editor', ${status},
      ${new Date(Date.now() + (expired ? -hour : week))},
      now(), ${ownerId}
    )`;

  return invitationId;
});

const refusedBody = {
  code: "SIGN_UP_BY_INVITATION",
  message:
    "Accounts on this server are made by invitation: open the link of the invitation, and sign up with the address it went to",
};

const refused = Effect.fn("refused")(function* refused(
  reply: Effect.Effect<Reply, never, TestApp>
) {
  const answer = yield* reply;

  assert.strictEqual(answer.status, 403);
  assert.deepStrictEqual(answer.body, refusedBody);
});

const decodeSignedUp = Schema.decodeUnknownEffect(SignedUpSchema);

const settings = { timeout: "180 seconds" } as const;

layer(
  Layer.mergeAll(
    TestApp.layerWith({ PEAL_SIGN_UP: "invitation" }),
    MigratedSqlLive
  ),
  settings
)("a server where accounts are made by invitation", (it) => {
  it.effect("tells the sign-up page, once the server has an account", () =>
    Effect.gen(function* tells() {
      yield* invite(newEmail("someone"));

      const reply = yield* TestApp.use((app) => app.request("/api/captcha"));

      assert.deepStrictEqual(
        yield* Schema.decodeUnknownEffect(CaptchaSchema)(reply.body),
        { signUp: "invitation", turnstileSiteKey: null }
      );
    })
  );

  it.effect("refuses an address without an invitation, saying why", () =>
    Effect.gen(function* uninvited() {
      yield* refused(signUp(newEmail("uninvited")));
    })
  );

  it.effect("refuses an invited address that names no invitation", () =>
    Effect.gen(function* addressAlone() {
      const email = newEmail("invited-alone");

      yield* invite(email);
      yield* refused(signUp(email));
    })
  );

  it.effect("refuses an invitation's id with another address", () =>
    Effect.gen(function* otherAddress() {
      const invitationId = yield* invite(newEmail("invited-elsewhere"));

      yield* refused(signUp(newEmail("stranger"), invitationId));
    })
  );

  it.effect("refuses an invited address with another invitation's id", () =>
    Effect.gen(function* otherInvitation() {
      const email = newEmail("invited-twice");

      yield* invite(email);

      const other = yield* invite(newEmail("someone-else"));

      yield* refused(signUp(email, other));
      yield* refused(signUp(email, "not-an-invitation"));
    })
  );

  it.effect("answers every refusal alike, an account or not", () =>
    Effect.gen(function* alike() {
      const email = newEmail("has-account");
      const sql = yield* SqlClient.SqlClient;

      yield* sql`
        INSERT INTO auth."user" (id, name, email, email_verified, created_at, updated_at)
        VALUES (${randomUUID()}, 'Has an account', ${email}, true, now(), now())`;

      yield* refused(signUp(email));
      yield* refused(signUp(newEmail("first-stranger")));
      yield* refused(signUp(newEmail("second-stranger")));
    })
  );

  it.effect("signs up the invited address with its invitation", () =>
    Effect.gen(function* invited() {
      const email = newEmail("invited");
      const invitationId = yield* invite(email);

      const created = yield* signUp(email.toUpperCase(), invitationId);

      assert.strictEqual(created.status, 200);
      assert.strictEqual(
        (yield* decodeSignedUp(created.body)).user.email,
        email.toLowerCase()
      );
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
        const invitationId = yield* invite(email, options);

        yield* refused(signUp(email, invitationId));
      }
    })
  );

  it.effect(
    "answers an invited address that has an account as an open server does",
    () =>
      Effect.gen(function* invitedWithAccount() {
        const email = newEmail("invited-member");
        const invitationId = yield* invite(email);

        const first = yield* signUp(email, invitationId);
        const again = yield* signUp(email, invitationId);

        assert.strictEqual(first.status, 200);
        assert.strictEqual(again.status, 200);

        // A made-up user, as Better Auth answers a known address: no
        // session, and not the account's id.
        const made = yield* decodeSignedUp(first.body);
        const madeUp = yield* decodeSignedUp(again.body);

        assert.isNull(madeUp.token);
        assert.strictEqual(madeUp.user.email, email);
        assert.notStrictEqual(madeUp.user.id, made.user.id);
      })
  );
});

// Without email verification a sign-up opens a session at once: only the
// invitation's holder gets one.
layer(
  Layer.mergeAll(
    TestApp.layerWith({
      AUTH_REQUIRE_EMAIL_VERIFICATION: "false",
      PEAL_SIGN_UP: "invitation",
    }),
    MigratedSqlLive
  ),
  settings
)("a server by invitation that does not confirm addresses", (it) => {
  it.effect("gives a session to the invitation's holder alone", () =>
    Effect.gen(function* holder() {
      const email = newEmail("invited-unconfirmed");
      const invitationId = yield* invite(email);

      yield* refused(signUp(email));

      const created = yield* signUp(email, invitationId);

      assert.strictEqual(created.status, 200);
      assert.isNotNull((yield* decodeSignedUp(created.body)).token);
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
