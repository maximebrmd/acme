import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { DigestLinks } from "#notifications/application/digest-links.ts";
import { HmacDigestLinks } from "#notifications/infrastructure/hmac-digest-links.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import {
  IntegrationLive,
  signedUp,
  TestApp,
} from "#test/workspace/integration/harness.ts";

// The weekly digest's one-click unsubscribe (RFC 8058) on the whole app: a
// mail client POSTs `List-Unsubscribe=One-Click` to the link the email's
// header gives, without a session; the token, signed with the server's
// secret (the development one, as in the app), turns the digest off and
// nothing else.

const Test = Layer.mergeAll(IntegrationLive, HmacDigestLinks);

const LinksSchema = Schema.Tuple([Schema.Struct({ links: Schema.Number })]);

const PreferencesSchema = Schema.Struct({
  email: Schema.Struct({
    postPublished: Schema.Boolean,
    weeklyDigest: Schema.Boolean,
  }),
});

const path = (token: string) =>
  `/api/notifications/weekly-digest/unsubscribe/${token}`;

// On the real clock, as the app runs: signing up waits for its email.
layer(Test, { excludeTestServices: true, timeout: "180 seconds" })(
  "the weekly digest's one-click unsubscribe",
  (it) => {
    it.effect(
      "turns the digest off from a token of the current generation, and that alone",
      () =>
        Effect.gen(function* unsubscribe() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const person = yield* signedUp("digest-unsubscribe");
          const userId = UserIdSchema.make(person.id);

          const preferences = Effect.gen(function* read() {
            const reply = yield* app.request(
              "/api/me/notification-preferences",
              {
                headers: { cookie: person.cookies },
              }
            );

            return yield* Schema.decodeUnknownEffect(PreferencesSchema)(
              reply.body
            );
          });

          yield* app.request("/api/me/notification-preferences", {
            body: { email: { postPublished: true, weeklyDigest: true } },
            headers: { cookie: person.cookies },
            method: "PATCH",
          });

          const [{ links }] = yield* Schema.decodeUnknownEffect(LinksSchema)(
            yield* sql`SELECT weekly_digest_links AS links FROM notifications.notification_preferences WHERE user_id = ${userId}`
          );

          const token = yield* DigestLinks.use((digest) =>
            digest.tokenOf(userId, links)
          );

          const stale = yield* DigestLinks.use((digest) =>
            digest.tokenOf(userId, links + 1)
          );

          // A token of another generation, or a forged one, does nothing.
          for (const refused of [stale, `${token.slice(0, -2)}AA`, "x"]) {
            const reply = yield* app.request(path(refused), {
              form: { "List-Unsubscribe": "One-Click" },
              method: "POST",
            });

            assert.strictEqual(reply.status, 404, refused);
          }

          assert.isTrue((yield* preferences).email.weeklyDigest);

          // Opening the link only shows where to turn it off.
          const opened = yield* app.request(path(token));

          assert.strictEqual(opened.status, 302);
          assert.strictEqual(
            opened.headers.get("location"),
            "http://localhost:3001/app/notices/preferences"
          );
          assert.isTrue((yield* preferences).email.weeklyDigest);

          const clicked = yield* app.request(path(token), {
            form: { "List-Unsubscribe": "One-Click" },
            method: "POST",
          });

          assert.strictEqual(clicked.status, 200);
          assert.deepStrictEqual((yield* preferences).email, {
            postPublished: true,
            weeklyDigest: false,
          });

          // Again: the same answer, nothing more changed.
          const again = yield* app.request(path(token), {
            form: { "List-Unsubscribe": "One-Click" },
            method: "POST",
          });

          assert.strictEqual(again.status, 200);
        })
    );
  }
);
