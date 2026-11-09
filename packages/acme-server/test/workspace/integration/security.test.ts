import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { MeSchema } from "acme-contract";
import { Context, Effect, Layer, Schema } from "effect";

import {
  apiKeyOf,
  bodyOf,
  confirmedAccount,
  cookiesOf,
  IntegrationLive,
  makeAdmin,
  origin,
  signIn,
  signedUp,
  TestApp,
  workspaceOf,
} from "./harness.ts";

interface Fixture {
  /** Signed in, then banned by staff: their cookies outlive their session. */
  readonly bannedCookies: string;
  readonly bannedWorkspaceId: string;
  /** An API key of the workspace with apiKey:read and post:read. */
  readonly key: string;
  /** A workspace the owner does not belong to. */
  readonly otherWorkspaceId: string;
  readonly ownerCookies: string;
  /** An API key of the workspace with post:read only. */
  readonly postReaderKey: string;
  readonly workspaceId: string;
}

class Matrix extends Context.Service<Matrix, Fixture>()(
  "acme-server/test/SecurityMatrix"
) {}

const MatrixLive = Layer.effect(
  Matrix,
  Effect.gen(function* matrix() {
    const app = yield* TestApp;

    // One after the other: the mail transport keeps one connection open,
    // where parallel emails would each open one, which Mailpit is slow to
    // greet.
    const owner = yield* signedUp("owner");
    const outsider = yield* signedUp("outsider");
    const banned = yield* signedUp("banned");
    const staff = yield* confirmedAccount("staff");

    const workspaceId = yield* workspaceOf(owner, "Studio");
    const otherWorkspaceId = yield* workspaceOf(outsider, "Elsewhere");
    const bannedWorkspaceId = yield* workspaceOf(banned, "Banned");

    const { key } = yield* apiKeyOf(owner, workspaceId, [
      "apiKey:read",
      "post:read",
    ]);

    const { key: postReaderKey } = yield* apiKeyOf(owner, workspaceId, [
      "post:read",
    ]);

    yield* makeAdmin(staff.id);

    const staffCookies = yield* signIn(staff.email);

    const ban = yield* app.request("/api/auth/admin/ban-user", {
      body: { userId: banned.id },
      headers: { cookie: staffCookies },
    });

    assert.strictEqual(ban.status, 200);

    return {
      bannedCookies: banned.cookies,
      bannedWorkspaceId,
      key,
      otherWorkspaceId,
      ownerCookies: owner.cookies,
      postReaderKey,
      workspaceId,
    };
  })
).pipe(Layer.provideMerge(IntegrationLive));

const bearer = (key: string) => ({ authorization: `Bearer ${key}` });

const apiKeys = (workspaceId: string) =>
  `/api/workspaces/${workspaceId}/api-keys`;

interface Case {
  readonly expected: number;
  readonly headers?: (fixture: Fixture) => Record<string, string>;
  readonly method?: "GET" | "POST";
  readonly name: string;
  readonly path: (fixture: Fixture) => string;
}

const newKey = { name: "deploy", permissions: ["post:read"] };

const MembersSchema = Schema.Struct({
  members: Schema.Array(Schema.Struct({ id: Schema.String })),
});

const cases: readonly Case[] = [
  {
    expected: 401,
    name: "no credentials",
    path: (fixture) => apiKeys(fixture.workspaceId),
  },
  {
    expected: 200,
    headers: (fixture) => ({ cookie: fixture.ownerCookies }),
    name: "a member's session",
    path: (fixture) => apiKeys(fixture.workspaceId),
  },
  {
    expected: 404,
    headers: (fixture) => ({ cookie: fixture.ownerCookies }),
    name: "a session on a workspace the user is not a member of",
    path: (fixture) => apiKeys(fixture.otherWorkspaceId),
  },
  {
    expected: 404,
    headers: (fixture) => ({ cookie: fixture.ownerCookies }),
    name: "a session on a workspace id that is not one",
    path: () => apiKeys("studio"),
  },
  {
    expected: 200,
    headers: (fixture) => bearer(fixture.key),
    name: "an API key of the workspace",
    path: (fixture) => apiKeys(fixture.workspaceId),
  },
  {
    expected: 403,
    headers: (fixture) => bearer(fixture.key),
    name: "an API key on another workspace",
    path: (fixture) => apiKeys(fixture.otherWorkspaceId),
  },
  {
    expected: 403,
    headers: (fixture) => bearer(fixture.postReaderKey),
    name: "an API key without the permission",
    path: (fixture) => apiKeys(fixture.workspaceId),
  },
  {
    expected: 401,
    headers: () => bearer("acme_not-a-key-that-was-ever-issued"),
    name: "an API key that was never issued",
    path: (fixture) => apiKeys(fixture.workspaceId),
  },
  {
    expected: 403,
    headers: (fixture) => ({ cookie: fixture.bannedCookies }),
    name: "a banned user's cached session, reading",
    path: (fixture) => apiKeys(fixture.bannedWorkspaceId),
  },
  {
    expected: 401,
    headers: (fixture) => ({ cookie: fixture.bannedCookies }),
    method: "POST",
    name: "a banned user's cached session, writing",
    path: (fixture) => apiKeys(fixture.bannedWorkspaceId),
  },
  {
    expected: 403,
    headers: (fixture) => ({
      cookie: fixture.ownerCookies,
      origin: "https://elsewhere.example",
    }),
    method: "POST",
    name: "a member's session sent by another site",
    path: (fixture) => apiKeys(fixture.workspaceId),
  },
  {
    expected: 401,
    name: "no credentials on /api/me",
    path: () => "/api/me",
  },
  {
    expected: 200,
    headers: (fixture) => ({ cookie: fixture.ownerCookies }),
    name: "a session on /api/me",
    path: () => "/api/me",
  },
  {
    expected: 403,
    headers: (fixture) => bearer(fixture.key),
    name: "an API key on /api/me",
    path: () => "/api/me",
  },
  {
    expected: 403,
    headers: (fixture) => ({ cookie: fixture.bannedCookies }),
    name: "a banned user's cached session on /api/me",
    path: () => "/api/me",
  },
];

layer(MatrixLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "the API's security middleware",
  (it) => {
    it.effect.each(cases)(
      "answers $expected to $name",
      ({ expected, headers, method = "GET", path }) =>
        Effect.gen(function* answers() {
          const app = yield* TestApp;
          const fixture = yield* Matrix;

          const reply = yield* app.request(path(fixture), {
            body: method === "POST" ? newKey : undefined,
            headers: { origin, ...headers?.(fixture) },
            method,
          });

          assert.strictEqual(reply.status, expected);
        })
    );

    it.effect(
      "lets staff impersonate a member, without publishing or handling keys",
      () =>
        Effect.gen(function* impersonates() {
          const app = yield* TestApp;
          const member = yield* signedUp("impersonated");
          const workspaceId = yield* workspaceOf(member, "Shop");
          const staff = yield* confirmedAccount("support");

          const { apiKey, key } = yield* apiKeyOf(member, workspaceId, [
            "apiKey:read",
          ]);

          yield* makeAdmin(staff.id);

          const started = yield* app.request(
            "/api/auth/admin/impersonate-user",
            {
              body: { userId: member.id },
              headers: { cookie: yield* signIn(staff.email) },
            }
          );

          assert.strictEqual(started.status, 200);

          const cookie = cookiesOf(started);

          const me = yield* bodyOf(
            MeSchema,
            yield* app.request("/api/me", { headers: { cookie } })
          );

          assert.strictEqual(me.user.id, member.id);
          assert.strictEqual(me.impersonatedBy, staff.id);
          assert.notInclude(
            me.workspaces[0]?.permissions ?? [],
            "post:publish"
          );
          assert.include(me.workspaces[0]?.permissions ?? [], "post:schedule");

          const created = yield* app.request(apiKeys(workspaceId), {
            body: newKey,
            headers: { cookie },
          });

          assert.strictEqual(created.status, 403);

          // Better Auth's own key routes are off: keys go through Acme's API.
          const listed = yield* app.request(
            `/api/auth/api-key/list?organizationId=${workspaceId}`,
            { headers: { cookie } }
          );

          const deleted = yield* app.request("/api/auth/api-key/delete", {
            body: { keyId: apiKey.id },
            headers: { cookie },
          });

          assert.strictEqual(listed.status, 404);
          assert.strictEqual(deleted.status, 404);

          // Staff may read the workspace's members, and change nothing.
          const members = yield* app.request(
            `/api/auth/organization/list-members?organizationId=${workspaceId}`,
            { headers: { cookie } }
          );

          assert.strictEqual(members.status, 200);

          const [owner] = (yield* bodyOf(MembersSchema, members)).members;
          const memberId = owner?.id ?? "";

          const changes = [
            [
              "invite-member",
              {
                email: staff.email,
                organizationId: workspaceId,
                role: "owner",
              },
            ],
            [
              "update-member-role",
              { memberId, organizationId: workspaceId, role: "viewer" },
            ],
            [
              "remove-member",
              { memberIdOrEmail: memberId, organizationId: workspaceId },
            ],
            [
              "update",
              { data: { name: "Renamed" }, organizationId: workspaceId },
            ],
            ["delete", { organizationId: workspaceId }],
            ["create", { name: "Mine", slug: `mine-${randomUUID()}` }],
          ] as const;

          for (const [route, body] of changes) {
            const changed = yield* app.request(
              `/api/auth/organization/${route}`,
              { body, headers: { cookie } }
            );

            assert.strictEqual(changed.status, 403, route);
          }

          // The key, and the member's place in the workspace, are untouched.
          const stillWorks = yield* app.request(apiKeys(workspaceId), {
            headers: bearer(key),
          });

          assert.strictEqual(stillWorks.status, 200);

          const ownerMe = yield* bodyOf(
            MeSchema,
            yield* app.request("/api/me", {
              headers: { cookie: member.cookies },
            })
          );

          assert.deepStrictEqual(
            ownerMe.workspaces.map(({ id, role }) => ({ id, role })),
            [{ id: workspaceId, role: "owner" }]
          );
        })
    );

    it.effect("signs a banned user out for good", () =>
      Effect.gen(function* bannedSignIn() {
        const app = yield* TestApp;
        const banned = yield* confirmedAccount("banned-again");
        const staff = yield* confirmedAccount("staff-again");

        yield* makeAdmin(staff.id);

        yield* app.request("/api/auth/admin/ban-user", {
          body: { userId: banned.id },
          headers: { cookie: yield* signIn(staff.email) },
        });

        const reply = yield* app.request("/api/auth/sign-in/email", {
          body: {
            email: banned.email,
            password: "correct horse battery staple",
          },
        });

        assert.strictEqual(reply.status, 403);
      })
    );
  }
);
