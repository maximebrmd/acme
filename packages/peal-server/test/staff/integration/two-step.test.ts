// Staff and two-step verification, through the whole server: resetting it
// for a member who lost their phone and codes, and the console refused to
// staff without it on a server that requires it of them.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { StaffAuditPageSchema, StaffUserSchema } from "peal-contract";

import {
  bodyOf,
  confirmedAccount,
  emailTo,
  IntegrationLive,
  makeAdmin,
  MigratedSqlLive,
  signIn,
  signedUp,
  TestApp,
} from "#test/workspace/integration/harness.ts";
import {
  codeOf,
  enrolled,
  passwordStep,
  secondStep,
  signInWithCode,
  withCookies,
} from "#test/workspace/support.ts";

const json = <S extends Schema.Top>(schema: S) => Schema.toCodecJson(schema);

const reason = { reason: "Synthetic support ticket 21, identity checked" };

const CountSchema = Schema.Tuple([Schema.Struct({ count: Schema.Number })]);

const decodeCount = Schema.decodeUnknownEffect(CountSchema);

// How many rows a count(*) query found.
const countOf = (rows: readonly object[]) =>
  decodeCount(rows).pipe(
    Effect.map(([{ count }]) => count),
    Effect.orDie
  );

layer(IntegrationLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "staff resetting two-step verification",
  (it) => {
    it.effect(
      "turns it off, forgets the account's browsers, signs it out everywhere, emails it and keeps it in the audit log",
      () =>
        Effect.gen(function* reset() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const member = yield* signedUp("reset-member");
          const { key } = yield* enrolled(member);

          // A browser the member trusted.
          const challenged = yield* passwordStep(member.email);
          const browser = withCookies("", challenged);

          const trusted = yield* secondStep(browser, {
            code: yield* Effect.promise(async () => await codeOf(key)),
            route: "verify-totp",
            trustDevice: true,
          });

          const trustedBrowser = withCookies(browser, trusted);

          const staff = yield* confirmedAccount("reset-staff");

          yield* makeAdmin(staff.id);

          const staffCookies = yield* signIn(staff.email);

          const before = yield* bodyOf(
            json(StaffUserSchema),
            yield* app.request(`/api/admin/users/${member.id}`, {
              headers: { cookie: staffCookies },
            })
          );

          assert.isTrue(before.twoStepEnabled);

          // Never on their own account.
          const onSelf = yield* app.request(
            `/api/admin/users/${staff.id}/two-step/reset`,
            { body: reason, headers: { cookie: staffCookies } }
          );

          assert.strictEqual(onSelf.status, 409);

          const done = yield* app.request(
            `/api/admin/users/${member.id}/two-step/reset`,
            { body: reason, headers: { cookie: staffCookies } }
          );

          assert.strictEqual(done.status, 204, JSON.stringify(done.body));

          const after = yield* bodyOf(
            json(StaffUserSchema),
            yield* app.request(`/api/admin/users/${member.id}`, {
              headers: { cookie: staffCookies },
            })
          );

          assert.isFalse(after.twoStepEnabled);
          assert.strictEqual(after.sessions, 0);

          assert.strictEqual(
            yield* countOf(
              yield* sql`SELECT count(*)::int AS count FROM auth.two_factor WHERE user_id = ${member.id}`.pipe(
                Effect.orDie
              )
            ),
            0
          );
          assert.strictEqual(
            yield* countOf(
              yield* sql`SELECT count(*)::int AS count FROM auth.verification WHERE value = ${member.id} AND identifier LIKE 'trust-device-%'`.pipe(
                Effect.orDie
              )
            ),
            0
          );

          const audit = yield* bodyOf(
            json(StaffAuditPageSchema),
            yield* app.request(`/api/admin/audit?targetId=${member.id}`, {
              headers: { cookie: staffCookies },
            })
          );

          assert.deepInclude(
            audit.items.map(({ action, reason: why, staffId }) => ({
              action,
              reason: why,
              staffId,
            })),
            { action: "resetTwoStep", reason: reason.reason, staffId: staff.id }
          );

          yield* emailTo(
            member.email,
            /^Two-step verification was reset on your Peal account/u
          );

          // The password alone signs in now, the trusted browser's too.
          const signedIn = yield* passwordStep(member.email, {
            cookies: trustedBrowser,
          });

          assert.strictEqual(signedIn.status, 200);
          assert.notProperty(signedIn.body, "twoFactorRedirect");

          // Turned on again, the browser trusted before is asked again.
          const again = yield* enrolled({
            ...member,
            cookies: withCookies(trustedBrowser, signedIn),
          });

          const challengedAgain = yield* passwordStep(member.email, {
            cookies: trustedBrowser,
          });

          assert.property(challengedAgain.body, "twoFactorRedirect");

          yield* signInWithCode(member.email, again.key);
        })
    );
  }
);

layer(
  MigratedSqlLive.pipe(
    Layer.provideMerge(TestApp.layerWith({ PEAL_STAFF_TWO_STEP: "true" }))
  ),
  { excludeTestServices: true, timeout: "180 seconds" }
)("a console that requires two-step verification of staff", (it) => {
  it.effect(
    "refuses staff without it, says so to staff alone, and lets them in once it is on",
    () =>
      Effect.gen(function* console() {
        const app = yield* TestApp;
        const staff = yield* signedUp("console-staff");
        const someone = yield* signedUp("console-someone");

        yield* makeAdmin(staff.id);

        const staffCookies = yield* signIn(staff.email);

        const refused = yield* app.request("/api/admin/session", {
          headers: { cookie: staffCookies },
        });

        assert.strictEqual(refused.status, 403);
        assert.deepInclude(refused.body, { reason: "twoStepRequired" });

        const notStaff = yield* app.request("/api/admin/session", {
          headers: { cookie: someone.cookies },
        });

        assert.strictEqual(notStaff.status, 404);

        const { key } = yield* enrolled({ ...staff, cookies: staffCookies });
        const withIt = yield* signInWithCode(staff.email, key);

        const admitted = yield* app.request("/api/admin/session", {
          headers: { cookie: withIt },
        });

        assert.strictEqual(admitted.status, 200);
      })
  );
});
