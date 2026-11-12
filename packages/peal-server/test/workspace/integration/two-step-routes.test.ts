import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Config, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { enrolled, joined, withCookies } from "#test/workspace/support.ts";

import {
  bodyOf,
  MigratedSqlLive,
  password,
  signedUp,
  signedUpUnconfirmed,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "./harness.ts";
import type { Reply } from "./harness.ts";

// Better Auth's own routes of a workspace, which never pass
// WorkspaceAccess, for a member whose account lacks the two-step
// verification the workspace requires: refused those that read or change
// it, let through those that list their workspaces, switch between them,
// answer an invitation or leave. And the two-step routes' own rules:
// turning it on needs a confirmed address, turning it off waits until no
// workspace of theirs requires it.

const stripeMockUrl = Config.String("STRIPE_MOCK_URL").pipe(
  Config.withDefault("http://127.0.0.1:12111")
);

// A server that bills, against stripe-mock, so the subscription routes
// are served.
const BillingLive = Layer.unwrap(
  Effect.gen(function* billingApp() {
    const apiUrl = yield* stripeMockUrl;

    return TestApp.layerWith({
      STRIPE_API_URL: apiUrl,
      STRIPE_SECRET_KEY: "sk_test_synthetic_two_step_routes",
      STRIPE_WEBHOOK_SECRET: "whsec_synthetic_two_step_routes",
    });
  })
).pipe(Layer.provideMerge(MigratedSqlLive));

const codeOf = (reply: Reply): string =>
  Schema.decodeUnknownOption(Schema.Struct({ code: Schema.String }))(
    reply.body
  ).pipe(Option.match({ onNone: () => "", onSome: ({ code }) => code }));

const SlugSchema = Schema.Struct({ slug: Schema.String });

// A route of Better Auth, with the JSON body it takes, if any.
interface Call {
  readonly body?: object;
  readonly path: string;
}

const send = (cookie: string, call: Call) =>
  TestApp.use((app) =>
    call.body === undefined
      ? app.request(`/api/auth${call.path}`, { headers: { cookie } })
      : app.request(`/api/auth${call.path}`, {
          body: call.body,
          headers: { cookie },
        })
  );

// The workspace, named by the request as each route takes it.
const guardedCalls = (
  workspaceId: string,
  slug: string,
  invitationId: string,
  ownerEmail: string
): readonly Call[] => {
  const organization = {
    customerType: "organization",
    referenceId: workspaceId,
  };

  return [
    { path: "/organization/get-active-member" },
    {
      path: `/organization/get-active-member-role?organizationId=${workspaceId}`,
    },
    {
      path: `/organization/get-full-organization?organizationId=${workspaceId}`,
    },
    { path: `/organization/get-full-organization?organizationSlug=${slug}` },
    { path: `/organization/get-organization?organizationId=${workspaceId}` },
    { path: `/organization/list-invitations?organizationId=${workspaceId}` },
    { path: `/organization/list-members?organizationId=${workspaceId}` },
    { body: { invitationId }, path: "/organization/cancel-invitation" },
    {
      body: { organizationId: workspaceId, permissions: { post: ["read"] } },
      path: "/organization/has-permission",
    },
    {
      body: {
        email: `invitee+${randomUUID()}@example.test`,
        organizationId: workspaceId,
        role: "viewer",
      },
      path: "/organization/invite-member",
    },
    {
      body: { memberIdOrEmail: ownerEmail, organizationId: workspaceId },
      path: "/organization/remove-member",
    },
    {
      body: { data: { name: "Renamed" }, organizationId: workspaceId },
      path: "/organization/update",
    },
    {
      body: {
        memberId: randomUUID(),
        organizationId: workspaceId,
        role: "viewer",
      },
      path: "/organization/update-member-role",
    },
    {
      body: { ...organization, plan: "starter" },
      path: "/subscription/upgrade",
    },
    {
      body: { ...organization, returnUrl: "http://localhost:3001/app" },
      path: "/subscription/cancel",
    },
    { body: organization, path: "/subscription/restore" },
    {
      body: { ...organization, returnUrl: "http://localhost:3001/app" },
      path: "/subscription/billing-portal",
    },
    {
      path: `/subscription/list?referenceId=${workspaceId}&customerType=organization`,
    },
    // The session's active workspace, as no workspace is named.
    { path: "/subscription/success?callbackURL=%2Fapp" },
  ];
};

layer(BillingLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "Better Auth's workspace routes",
  (it) => {
    it.effect(
      "refuse a member the workspace locks out what reads or changes it, and nothing else",
      () =>
        Effect.gen(function* lockedOut() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const owner = yield* signedUp("routes-owner");
          const workspaceId = yield* workspaceOf(owner, "Fenced");

          const member = yield* joined(
            owner,
            workspaceId,
            "routes-member",
            "admin"
          );

          // A workspace of the member's own, which requires nothing: the
          // decoy a request may name beside the one it acts on.
          const ownId = yield* workspaceOf(member, "Decoy");

          const { cookies } = yield* enrolled(owner);

          const { slug } = yield* bodyOf(
            SlugSchema,
            yield* app.request(
              `/api/auth/organization/get-full-organization?organizationId=${workspaceId}`,
              { headers: { cookie: cookies } }
            )
          );

          // A pending invitation, as the invitations page would send it:
          // the free plan has no seat left for one through the API.
          const invitationId = randomUUID();

          yield* sql`INSERT INTO auth.invitation (id, organization_id, email, role, status, expires_at, created_at, inviter_id)
            VALUES (${invitationId}, ${workspaceId}, ${`pending+${randomUUID()}@example.test`}, 'viewer', 'pending', now() + interval '7 days', now(), ${owner.id})`.pipe(
            Effect.orDie
          );

          const required = yield* app.request(
            `/api/workspaces/${workspaceId}/security`,
            {
              body: { twoStepRequired: true },
              headers: { cookie: cookies },
              method: "PUT",
            }
          );

          assert.strictEqual(required.status, 200);

          // The picker stays open, and makes the workspace the active one.
          const picked = yield* send(member.cookies, {
            body: { organizationId: workspaceId },
            path: "/organization/set-active",
          });

          assert.strictEqual(picked.status, 200, JSON.stringify(picked.body));

          const browser = withCookies(member.cookies, picked);

          for (const call of guardedCalls(
            workspaceId,
            slug,
            invitationId,
            owner.email
          )) {
            const refused = yield* send(browser, call);

            assert.strictEqual(
              refused.status,
              403,
              `${call.path}: ${JSON.stringify(refused.body)}`
            );
            assert.strictEqual(codeOf(refused), "TWO_STEP_REQUIRED", call.path);
          }

          // Naming their own workspace in a field the route does not read
          // is refused; named where the route reads it, it is the one
          // checked, and the active workspace only when no field the
          // route reads holds one.
          const decoys: readonly (Call & { readonly code: string })[] = [
            {
              code: "WORKSPACE_FIELD_NOT_READ",
              path: `/organization/list-members?referenceId=${ownId}`,
            },
            {
              code: "WORKSPACE_FIELD_NOT_READ",
              path: `/organization/get-full-organization?referenceId=${ownId}`,
            },
            {
              code: "WORKSPACE_FIELD_NOT_READ",
              path: `/organization/list-invitations?referenceId=${ownId}`,
            },
            {
              body: { data: { name: "Renamed" }, referenceId: ownId },
              code: "WORKSPACE_FIELD_NOT_READ",
              path: "/organization/update",
            },
            {
              body: { data: { name: "Renamed" } },
              code: "WORKSPACE_FIELD_NOT_READ",
              path: `/organization/update?organizationId=${ownId}`,
            },
            {
              body: {
                email: `invitee+${randomUUID()}@example.test`,
                referenceId: ownId,
                role: "viewer",
              },
              code: "WORKSPACE_FIELD_NOT_READ",
              path: "/organization/invite-member",
            },
            {
              body: { memberIdOrEmail: owner.email, referenceId: ownId },
              code: "WORKSPACE_FIELD_NOT_READ",
              path: "/organization/remove-member",
            },
            {
              body: {
                customerType: "organization",
                organizationId: ownId,
                plan: "starter",
              },
              code: "WORKSPACE_FIELD_NOT_READ",
              path: "/subscription/upgrade",
            },
          ];

          for (const { code, ...call } of decoys) {
            const refused = yield* send(browser, call);

            assert.strictEqual(
              codeOf(refused),
              code,
              `${call.path}: ${refused.status} ${JSON.stringify(refused.body)}`
            );
          }

          // Their own workspace, named where the route reads it, stays
          // theirs, though the active one requires it.
          const own = yield* send(browser, {
            path: `/organization/list-members?organizationId=${ownId}`,
          });

          assert.strictEqual(own.status, 200, JSON.stringify(own.body));

          const ownCheckout = yield* send(browser, {
            body: {
              customerType: "organization",
              plan: "starter",
              referenceId: ownId,
            },
            path: "/subscription/upgrade",
          });

          assert.notStrictEqual(
            codeOf(ownCheckout),
            "TWO_STEP_REQUIRED",
            JSON.stringify(ownCheckout.body)
          );

          // What they still reach.
          const open: readonly Call[] = [
            { path: "/organization/list" },
            { path: "/organization/list-user-invitations" },
            {
              body: { slug: `free-${randomUUID()}` },
              path: "/organization/check-slug",
            },
            { path: `/organization/get-invitation?id=${randomUUID()}` },
            {
              body: { invitationId: randomUUID() },
              path: "/organization/reject-invitation",
            },
            {
              body: { name: "Own", slug: `own-${randomUUID()}` },
              path: "/organization/create",
            },
          ];

          for (const call of open) {
            const answered = yield* send(browser, call);

            assert.notStrictEqual(
              codeOf(answered),
              "TWO_STEP_REQUIRED",
              call.path
            );
          }

          // The owner, with it on, is let through.
          const listed = yield* send(cookies, {
            path: `/organization/list-members?organizationId=${workspaceId}`,
          });

          assert.strictEqual(listed.status, 200);

          // An id in another form than Peal issues it is refused.
          const malformed = yield* send(browser, {
            path: `/organization/list-members?organizationId=${workspaceId.toUpperCase()}`,
          });

          assert.strictEqual(codeOf(malformed), "INVALID_ID");
        })
    );

    it.effect(
      "leave a member their own workspaces once they accept an invitation to one that requires it",
      () =>
        Effect.gen(function* invited() {
          const app = yield* TestApp;
          const owner = yield* signedUp("invited-owner");
          const strict = yield* workspaceOf(owner, "Strict");
          const { cookies } = yield* enrolled(owner);

          yield* app.request(`/api/workspaces/${strict}/security`, {
            body: { twoStepRequired: true },
            headers: { cookie: cookies },
            method: "PUT",
          });

          const person = yield* signedUp("invited-person");
          const ownId = yield* workspaceOf(person, "Mine");

          const sent = yield* bodyOf(
            Schema.Struct({ id: Schema.String }),
            yield* app.request(`/api/workspaces/${strict}/invitations`, {
              body: { email: person.email, role: "viewer" },
              headers: { cookie: cookies },
            })
          );

          // Accepting makes the invited workspace the session's active one.
          const accepted = yield* send(person.cookies, {
            body: { invitationId: sent.id },
            path: "/organization/accept-invitation",
          });

          assert.strictEqual(
            accepted.status,
            200,
            JSON.stringify(accepted.body)
          );

          // Without the session's cached copy, as once it lapses.
          const browser = withCookies(person.cookies, accepted)
            .split("; ")
            .filter((cookie) => !cookie.includes("session_data"))
            .join("; ");

          for (const call of [
            { path: `/organization/list-members?organizationId=${ownId}` },
            { path: `/organization/list-invitations?organizationId=${ownId}` },
            {
              body: { data: { name: "Still mine" }, organizationId: ownId },
              path: "/organization/update",
            },
          ]) {
            const answered = yield* send(browser, call);

            assert.strictEqual(
              answered.status,
              200,
              `${call.path}: ${JSON.stringify(answered.body)}`
            );
          }

          // The active workspace, which the route falls back to, is checked.
          const fallback = yield* send(browser, {
            path: "/organization/list-members",
          });

          assert.strictEqual(codeOf(fallback), "TWO_STEP_REQUIRED");
        })
    );

    it.effect(
      "refuse turning two-step verification off while a workspace requires it, and allow it after leaving",
      () =>
        Effect.gen(function* turningOff() {
          const app = yield* TestApp;
          const owner = yield* signedUp("off-owner");
          const workspaceId = yield* workspaceOf(owner, "Strict");

          const member = yield* joined(
            owner,
            workspaceId,
            "off-member",
            "viewer"
          );

          const ownerSession = (yield* enrolled(owner)).cookies;
          const { cookies } = yield* enrolled(member);

          yield* app.request(`/api/workspaces/${workspaceId}/security`, {
            body: { twoStepRequired: true },
            headers: { cookie: ownerSession },
            method: "PUT",
          });

          const refused = yield* send(cookies, {
            body: { password },
            path: "/two-factor/disable",
          });

          assert.strictEqual(refused.status, 403);
          assert.strictEqual(codeOf(refused), "TWO_STEP_REQUIRED_BY_WORKSPACE");
          assert.include(JSON.stringify(refused.body), "Strict");

          const left = yield* send(cookies, {
            body: { organizationId: workspaceId },
            path: "/organization/leave",
          });

          assert.strictEqual(left.status, 200, JSON.stringify(left.body));

          const turnedOff = yield* send(cookies, {
            body: { password },
            path: "/two-factor/disable",
          });

          assert.strictEqual(
            turnedOff.status,
            200,
            JSON.stringify(turnedOff.body)
          );
        })
    );
  }
);

layer(
  MigratedSqlLive.pipe(
    Layer.provideMerge(TestApp.layerWith(unconfirmedEmails))
  ),
  { excludeTestServices: true, timeout: "180 seconds" }
)("two-step verification on a server where accounts work unconfirmed", (it) => {
  it.effect("is turned on only once the email address is confirmed", () =>
    Effect.gen(function* unconfirmed() {
      const person = yield* signedUpUnconfirmed("unconfirmed");

      const refused = yield* send(person.cookies, {
        body: { password },
        path: "/two-factor/enable",
      });

      assert.strictEqual(refused.status, 400);
      assert.strictEqual(codeOf(refused), "EMAIL_NOT_VERIFIED_FOR_TWO_STEP");
    })
  );
});
