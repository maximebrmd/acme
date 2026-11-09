import { assert, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { IntegrationLive, signedUp, TestApp } from "./harness.ts";

const sessionCookie = "acme.session_token=";

const ExpirySchema = Schema.Array(Schema.Struct({ daysLeft: Schema.Number }));

layer(IntegrationLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "sessions",
  (it) => {
    // The web app's account menu asks Better Auth for the session, as the
    // API's own reads never extend it, so that someone who keeps using Acme
    // stays signed in.
    it.effect(
      "are extended when the browser asks Better Auth for them, not by GET /api/me",
      () =>
        Effect.gen(function* extended() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const person = yield* signedUp("regular");

          // Only the session cookie goes back, as once the copy cached in a
          // cookie has expired. It carries the token, then its signature.
          const cookie =
            person.cookies
              .split("; ")
              .find((pair) => pair.startsWith(sessionCookie)) ?? "";

          const [token = ""] = decodeURIComponent(
            cookie.slice(sessionCookie.length)
          ).split(".");

          // Two days into a thirty-day session, a day past being due for
          // extension.
          yield* sql`UPDATE auth.session SET expires_at = now() + interval '28 days', updated_at = now() - interval '2 days' WHERE token = ${token}`;

          const daysLeft = Effect.gen(function* daysLeft() {
            const rows =
              yield* sql`SELECT (extract(epoch FROM expires_at - now()) / 86400)::float8 AS "daysLeft" FROM auth.session WHERE token = ${token}`;

            const [row] = yield* Schema.decodeUnknownEffect(ExpirySchema)(rows);

            return row?.daysLeft ?? 0;
          });

          const read = yield* app.request("/api/me", { headers: { cookie } });

          assert.strictEqual(read.status, 200);
          assert.isBelow(yield* daysLeft, 28.5);

          const asked = yield* app.request("/api/auth/get-session", {
            headers: { cookie },
          });

          assert.strictEqual(asked.status, 200);
          assert.isAbove(yield* daysLeft, 29.5);
          assert.isTrue(
            asked.headers
              .getSetCookie()
              .some((set) => set.startsWith(sessionCookie))
          );
        })
    );
  }
);
