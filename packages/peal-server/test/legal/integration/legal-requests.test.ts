// What the law has a host keep, through the app: the connections that make
// content, what closing an account leaves, and the one way to read them, a
// legal request staff answer, itself recorded.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { SqlLive } from "#shared/infrastructure/database.ts";
import {
  bodyOf,
  confirmedAccount,
  emailTo,
  IntegrationLive,
  makeAdmin,
  password,
  signedUp,
  signIn,
  TestApp,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";

// The edge in front of Peal sets the client's address.
const clientAddress = "203.0.113.7";

const draftOf = (text: string) => ({
  channelIds: [],
  content: { media: [], overrides: [], text },
});

const ConnectionSchema = Schema.Struct({
  access: Schema.String,
  ipAddress: Schema.NullOr(Schema.String),
  protocol: Schema.String,
  workspaceId: Schema.NullOr(Schema.String),
});

const ExportSchema = Schema.Struct({
  legalHold: Schema.Struct({
    connectionYears: Schema.Number,
    connections: Schema.Array(ConnectionSchema),
    keptAfterClosure: Schema.Array(
      Schema.Struct({ data: Schema.Array(Schema.String), years: Schema.Number })
    ),
  }),
});

// What closing the account would leave, as the dialog asks before it.
const ClosureSchema = Schema.Struct({
  legalHold: Schema.NullOr(
    Schema.Struct({
      accountYears: Schema.NullOr(Schema.Number),
      connectionYears: Schema.Number,
      identityYears: Schema.NullOr(Schema.Number),
    })
  ),
});

const AnswerSchema = Schema.Struct({
  connections: Schema.Array(
    Schema.Struct({
      ...ConnectionSchema.fields,
      userId: Schema.NullOr(Schema.String),
    })
  ),
  held: Schema.Array(
    Schema.Struct({
      email: Schema.String,
      name: Schema.String,
      signInMethods: Schema.Array(
        Schema.Struct({ accountId: Schema.String, provider: Schema.String })
      ),
      userId: Schema.String,
    })
  ),
  id: Schema.String,
});

const DisclosureSchema = Schema.Array(
  Schema.Struct({
    authority: Schema.String,
    held: Schema.Number,
    reference: Schema.String,
    staff_id: Schema.String,
  })
);

// A server whose operator the law obliges turns the retention on.
const RetainingLive = Layer.mergeAll(
  TestApp.layerWith({ PEAL_LEGAL_RETENTION: "true" }),
  SqlLive
);

layer(RetainingLive, { excludeTestServices: true, timeout: "120 seconds" })(
  "legal requests",
  (it) => {
    it.effect(
      "keep each connection that made content and who held a closed account, for staff to read on a recorded legal request only",
      () =>
        Effect.gen(function* answers() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const ana = yield* signedUp("legal-ana");
          const workspaceId = yield* workspaceOf(ana, "Legal");

          const created = yield* app.request(
            `/api/workspaces/${workspaceId}/posts`,
            {
              body: draftOf("A synthetic draft of the legal test."),
              headers: {
                cookie: ana.cookies,
                "x-forwarded-for": clientAddress,
              },
            }
          );

          assert.strictEqual(created.status, 201);

          // Reading changes no content, and is not kept.
          yield* app.request(`/api/workspaces/${workspaceId}/posts`, {
            headers: { cookie: ana.cookies, "x-forwarded-for": clientAddress },
          });

          // Ana's export tells her what is kept, and why.
          const exported = yield* bodyOf(
            ExportSchema,
            yield* app.request("/api/me/export", {
              headers: { cookie: ana.cookies },
            })
          );

          assert.deepStrictEqual(exported.legalHold.connections, [
            {
              access: "session",
              ipAddress: clientAddress,
              protocol: "http",
              workspaceId,
            },
          ]);
          assert.strictEqual(exported.legalHold.connectionYears, 1);
          assert.deepStrictEqual(
            exported.legalHold.keptAfterClosure.map(({ years }) => years),
            [5, 1]
          );

          // And, before she closes her account, what that would leave.
          assert.deepStrictEqual(
            yield* bodyOf(
              ClosureSchema,
              yield* app.request("/api/me/closure", {
                headers: { cookie: ana.cookies },
              })
            ),
            {
              legalHold: {
                accountYears: 1,
                connectionYears: 1,
                identityYears: 5,
              },
            }
          );

          const closed = yield* app.request("/api/me", {
            body: { password },
            headers: { cookie: ana.cookies },
            method: "DELETE",
          });

          assert.strictEqual(closed.status, 204);
          assert.include(
            (yield* emailTo(ana.email, /^Your Peal account is deleted/u)).Text,
            "for judicial authorities only"
          );

          const request = {
            authority: "Synthetic public prosecutor",
            reference: "Synthetic requisition 2026-0001",
            subject: { email: ana.email.toUpperCase() },
          };

          // Anyone but staff finds nothing there.
          const stranger = yield* signedUp("legal-stranger");

          assert.strictEqual(
            (yield* app.request("/api/admin/legal-requests", {
              body: request,
              headers: { cookie: stranger.cookies },
            })).status,
            404
          );

          const staff = yield* confirmedAccount("legal-staff");

          yield* makeAdmin(staff.id);

          // Staff who help users, without the legal role, find nothing
          // there either.
          const helperCookies = yield* signIn(staff.email);

          assert.strictEqual(
            (yield* app.request("/api/admin/legal-requests", {
              body: request,
              headers: { cookie: helperCookies },
            })).status,
            404
          );

          yield* sql`UPDATE auth."user" SET role = 'admin,legal' WHERE id = ${staff.id}`;

          const staffCookies = yield* signIn(staff.email);

          const answered = yield* app.request("/api/admin/legal-requests", {
            body: request,
            headers: { cookie: staffCookies },
          });

          // Never a password, nor what checks one (CE, 30 June 2023, n° 459724).
          assert.notInclude(JSON.stringify(answered.body), "password");

          const answer = yield* bodyOf(AnswerSchema, answered);

          const [held] = answer.held;

          assert.strictEqual(answer.held.length, 1);
          assert.strictEqual(held?.userId, ana.id);
          assert.strictEqual(held?.email, ana.email);
          assert.deepStrictEqual(
            held?.signInMethods.map(({ provider }) => provider),
            ["credential"]
          );
          assert.deepStrictEqual(
            answer.connections.map(({ ipAddress, userId }) => ({
              ipAddress,
              userId,
            })),
            [{ ipAddress: clientAddress, userId: ana.id }]
          );

          // The answer was recorded, with who gave it and on what grounds.
          const disclosures =
            yield* sql`SELECT authority, held, reference, staff_id FROM legal.disclosures WHERE id = ${answer.id}`.pipe(
              Effect.flatMap(Schema.decodeUnknownEffect(DisclosureSchema)),
              Effect.orDie
            );

          assert.deepStrictEqual(disclosures, [
            {
              authority: request.authority,
              held: 1,
              reference: request.reference,
              staff_id: staff.id,
            },
          ]);

          // The rest of staff see it in the audit log.
          const audited =
            yield* sql`SELECT reason, staff_id FROM staff.audit_events WHERE action = 'legalDisclosure' AND staff_id = ${staff.id}`.pipe(
              Effect.flatMap(
                Schema.decodeUnknownEffect(
                  Schema.Array(
                    Schema.Struct({
                      reason: Schema.String,
                      staff_id: Schema.String,
                    })
                  )
                )
              ),
              Effect.orDie
            );

          assert.deepStrictEqual(audited, [
            {
              reason: `${request.authority}: ${request.reference}`,
              staff_id: staff.id,
            },
          ]);

          // Nothing else of Ana's is left.
          const left =
            yield* sql`SELECT count(*)::int AS count FROM auth."user" WHERE id = ${ana.id}`.pipe(
              Effect.flatMap(
                Schema.decodeUnknownEffect(
                  Schema.Array(Schema.Struct({ count: Schema.Number }))
                )
              ),
              Effect.orDie
            );

          assert.strictEqual(left[0]?.count, 0);

          // A request without its grounds is refused.
          assert.strictEqual(
            (yield* app.request("/api/admin/legal-requests", {
              body: { ...request, reference: " " },
              headers: { cookie: staffCookies },
            })).status,
            400
          );
        })
    );
  }
);

// A random UUID with the version digit of v7 reads as a record's id.
const uuid7 = () => {
  const random = randomUUID();

  return `${random.slice(0, 14)}7${random.slice(15)}`;
};

const countOf = Schema.decodeUnknownEffect(
  Schema.Array(Schema.Struct({ count: Schema.Number }))
);

// A server keeps nothing unless its operator turns the retention on: the
// law obliges some operators, and nobody else should hold this.
layer(IntegrationLive, { excludeTestServices: true, timeout: "120 seconds" })(
  "legal retention left off, as the software ships",
  (it) => {
    it.effect(
      "keeps no connection and nothing of a closed account, and says so in the export",
      () =>
        Effect.gen(function* off() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const ben = yield* signedUp("legal-off");
          const workspaceId = yield* workspaceOf(ben, "Elsewhere");

          const created = yield* app.request(
            `/api/workspaces/${workspaceId}/posts`,
            {
              body: draftOf("A synthetic draft kept for nobody."),
              headers: {
                cookie: ben.cookies,
                "x-forwarded-for": clientAddress,
              },
            }
          );

          assert.strictEqual(created.status, 201);

          const exported = yield* app.request("/api/me/export", {
            headers: { cookie: ben.cookies },
          });

          assert.isNull(
            (yield* bodyOf(Schema.Struct({ legalHold: Schema.Null }), exported))
              .legalHold
          );
          assert.deepStrictEqual(
            yield* bodyOf(
              ClosureSchema,
              yield* app.request("/api/me/closure", {
                headers: { cookie: ben.cookies },
              })
            ),
            { legalHold: null }
          );

          yield* app.request("/api/me", {
            body: { password },
            headers: { cookie: ben.cookies },
            method: "DELETE",
          });

          // The confirmation claims nothing is kept for the law.
          assert.notInclude(
            (yield* emailTo(ben.email, /^Your Peal account is deleted/u)).Text,
            "judicial"
          );

          const kept =
            yield* sql`SELECT (SELECT count(*) FROM legal.connections WHERE user_id = ${ben.id})::int + (SELECT count(*) FROM legal.identification_holds WHERE user_id = ${ben.id})::int AS count`.pipe(
              Effect.flatMap(countOf),
              Effect.orDie
            );

          assert.strictEqual(kept[0]?.count, 0);
        })
    );
  }
);

// A server that kept these records, then turned the retention off: what it
// holds stays until its term, and the user still reads it in their export.
layer(
  Layer.mergeAll(TestApp.layerWith({ PEAL_LEGAL_RETENTION: "false" }), SqlLive),
  { excludeTestServices: true, timeout: "120 seconds" }
)("legal retention turned off after it was on", (it) => {
  it.effect(
    "keeps nothing more, and still tells the user what it kept before",
    () =>
      Effect.gen(function* turnedOff() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const cleo = yield* signedUp("legal-turned-off");
        const workspaceId = yield* workspaceOf(cleo, "Before");

        // A connection kept while the retention was on.
        yield* sql`INSERT INTO legal.connections (id, access, at, protocol, ip_address, user_id, workspace_id)
          VALUES (${uuid7()}, 'session', ${new Date()}, 'https', ${clientAddress}, ${cleo.id}, ${workspaceId})`;

        const created = yield* app.request(
          `/api/workspaces/${workspaceId}/posts`,
          {
            body: draftOf("A synthetic draft written once it was off."),
            headers: { cookie: cleo.cookies, "x-forwarded-for": clientAddress },
          }
        );

        assert.strictEqual(created.status, 201);

        const exported = yield* bodyOf(
          ExportSchema,
          yield* app.request("/api/me/export", {
            headers: { cookie: cleo.cookies },
          })
        );

        // The one kept before, not the write made since; closing the
        // account would leave nothing new.
        assert.deepStrictEqual(exported.legalHold.connections, [
          {
            access: "session",
            ipAddress: clientAddress,
            protocol: "https",
            workspaceId,
          },
        ]);
        assert.strictEqual(exported.legalHold.connectionYears, 1);
        assert.deepStrictEqual(exported.legalHold.keptAfterClosure, []);
        assert.deepStrictEqual(
          yield* bodyOf(
            ClosureSchema,
            yield* app.request("/api/me/closure", {
              headers: { cookie: cleo.cookies },
            })
          ),
          {
            legalHold: {
              accountYears: null,
              connectionYears: 1,
              identityYears: null,
            },
          }
        );

        yield* app.request("/api/me", {
          body: { password },
          headers: { cookie: cleo.cookies },
          method: "DELETE",
        });

        const kept =
          yield* sql`SELECT (SELECT count(*) FROM legal.connections WHERE user_id = ${cleo.id})::int AS connections, (SELECT count(*) FROM legal.identification_holds WHERE user_id = ${cleo.id})::int AS holds`.pipe(
            Effect.flatMap(
              Schema.decodeUnknownEffect(
                Schema.Array(
                  Schema.Struct({
                    connections: Schema.Number,
                    holds: Schema.Number,
                  })
                )
              )
            ),
            Effect.orDie
          );

        // What was kept stays until the purge ends it; nothing is added.
        assert.deepStrictEqual(kept, [{ connections: 1, holds: 0 }]);
      })
  );
});
