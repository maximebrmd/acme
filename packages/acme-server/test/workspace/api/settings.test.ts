import { assert, layer } from "@effect/vitest";
import { Api } from "acme-contract";
import type { Member, Principal } from "acme-contract";
import {
  Context,
  DateTime,
  Effect,
  Layer,
  Option,
  Redacted,
  Ref,
} from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";

import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { AccountHandlers } from "#workspace/api/account.ts";
import { ConnectedAppsHandlers } from "#workspace/api/connected-apps.ts";
import {
  anonymousSecurityTest,
  securityTest,
} from "#workspace/api/security.ts";
import { WorkspacesHandlers } from "#workspace/api/workspaces.ts";
import { AccountData } from "#workspace/application/account-data.ts";
import { AccountMail } from "#workspace/application/account-mail.ts";
import { AccountStore } from "#workspace/application/account-store.ts";
import type { AccountRecords } from "#workspace/application/account-store.ts";
import { ApiKeyIssuer } from "#workspace/application/api-key-issuer.ts";
import { CloseAccount } from "#workspace/application/close-account.ts";
import { ConnectedAppStore } from "#workspace/application/connected-app-store.ts";
import { ConnectedApps } from "#workspace/application/connected-apps.ts";
import { ContextRecords } from "#workspace/application/context-records.ts";
import { DeleteWorkspace } from "#workspace/application/delete-workspace.ts";
import { PasswordCheck } from "#workspace/application/password-check.ts";
import { TooManyPasswordAttempts } from "#workspace/application/too-many-password-attempts.ts";
import { WorkspaceBusy } from "#workspace/application/workspace-busy.ts";
import { WorkspaceSubscribed } from "#workspace/application/workspace-subscribed.ts";
import type { MembershipStanding } from "#workspace/domain/account-closure.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The settings endpoints on their real use cases, over ports kept in memory.
// Each request acts as a principal, as the Authentication and
// WorkspaceAccess middlewares would: who may do what is the point.

const at = DateTime.makeUnsafe("2026-11-09T08:00:00.000Z");

const userId = UserIdSchema.make("0b6e2f4a-3c1d-4e5f-8a9b-1c2d3e4f5a6b");

const otherUserId = UserIdSchema.make("1c7f3a5b-4d2e-4f60-9bac-2d3e4f5a6b7c");

const harbour = WorkspaceIdSchema.make("2d8a4b6c-5e3f-4a71-8cbd-3e4f5a6b7c8d");

const busy = WorkspaceIdSchema.make("3e9b5c7d-6f4a-4b82-9dce-4f5a6b7c8d9e");

const shared = WorkspaceIdSchema.make("4fac6d8e-7a5b-4c93-8edf-5a6b7c8d9eaf");

const subscribed = WorkspaceIdSchema.make(
  "6b1c8d0e-9f7a-4eb5-8a21-7c8d9eafb0c1"
);

const names: ReadonlyMap<WorkspaceId, string> = new Map([
  [harbour, "Harbour"],
  [busy, "Busy"],
  [shared, "Shared"],
  [subscribed, "Subscribed"],
]);

const records: AccountRecords = {
  invitationsReceived: [],
  invitationsSent: [],
  memberships: [
    {
      joinedAt: at,
      role: "owner",
      workspaceId: harbour,
      workspaceName: "Harbour",
    },
  ],
  sessions: [],
  signInMethods: [{ createdAt: at, provider: "credential", updatedAt: at }],
  user: {
    createdAt: at,
    email: "ana@example.test",
    emailVerified: true,
    id: userId,
    image: null,
    locale: "fr",
    name: "Ana",
    updatedAt: at,
  },
};

/**
 * What the ports were asked to do, in order, and each user's workspaces as
 * closing their account reads them, which tests set.
 */
class Fakes extends Context.Service<
  Fakes,
  {
    readonly calls: Ref.Ref<readonly string[]>;
    readonly standings: Ref.Ref<
      ReadonlyMap<UserId, readonly MembershipStanding[]>
    >;
  }
>()("test/workspace/api/Fakes") {
  static readonly layer = Layer.effect(
    Fakes,
    Effect.all({
      calls: Ref.make<readonly string[]>([]),
      standings: Ref.make<ReadonlyMap<UserId, readonly MembershipStanding[]>>(
        new Map()
      ),
    })
  );
}

const record = (call: string) =>
  Fakes.use(({ calls }) => Ref.update(calls, (before) => [...before, call]));

const PortsLive = Layer.mergeAll(
  Layer.effect(
    AccountStore,
    Effect.gen(function* AccountStoreTest() {
      const fakes = yield* Fakes;
      const provide = Effect.provideService(Fakes, fakes);

      return AccountStore.of({
        deleteUser: (id) => record(`deleteUser:${id}`).pipe(provide),
        deleteWorkspace: (id) => record(`deleteWorkspace:${id}`).pipe(provide),
        records: (id) =>
          Effect.succeed(id === userId ? Option.some(records) : Option.none()),
        standings: (id) =>
          Ref.get(fakes.standings).pipe(Effect.map((all) => all.get(id) ?? [])),
        workspace: (id) =>
          Effect.succeed(
            Option.fromUndefinedOr(names.get(id)).pipe(
              Option.map((name) => ({
                createdAt: at,
                id,
                name,
                slug: name.toLowerCase(),
              }))
            )
          ),
      });
    })
  ),
  Layer.effect(
    ContextRecords,
    Effect.gen(function* ContextRecordsTest() {
      const provide = Effect.provideService(Fakes, yield* Fakes);

      return ContextRecords.of({
        eraseUser: (id) => record(`eraseUser:${id}`).pipe(provide),
        eraseWorkspace: (id) => {
          if (id === busy) {
            return Effect.fail(new WorkspaceBusy({ workspaceId: id }));
          }

          // Stripe may still bill it.
          if (id === subscribed) {
            return Effect.fail(new WorkspaceSubscribed({ workspaceId: id }));
          }

          return record(`eraseWorkspace:${id}`).pipe(provide);
        },
        exportAuthoredPosts: (id, workspaceIds) =>
          record(`exportAuthored:${id}:${workspaceIds.join(",")}`).pipe(
            provide,
            Effect.as(
              workspaceIds.map((workspaceId) => ({
                id: "019a6f10-0000-7000-8000-000000000001",
                media: [],
                scheduledAt: null,
                status: "draft",
                targets: [],
                text: "A synthetic post of Ana's.",
                textOverrides: [],
                timeZone: null,
                workspaceId,
              }))
            )
          ),
        exportUser: () =>
          Effect.succeed({
            notices: [],
            preferences: {
              email: {
                channelReconnect: true,
                postFailed: true,
                postPublished: false,
                postUnconfirmed: true,
              },
              everyPost: false,
            },
          }),
        exportWorkspace: () =>
          Effect.succeed({
            assistantUsage: [{ day: "2026-11-09", requests: 3 }],
            billing: {
              plan: "pro",
              subscriptions: [
                {
                  cancelAtPeriodEnd: false,
                  currentPeriodEnd: at,
                  plan: "pro",
                  status: "active",
                },
              ],
            },
            channels: [],
            media: [],
            posts: [],
          }),
        removeWorkspaceFiles: (id) => record(`removeFiles:${id}`).pipe(provide),
      });
    })
  ),
  Layer.succeed(
    PasswordCheck,
    PasswordCheck.of({
      // A password tried too often is not checked.
      matches: (_, password) =>
        Redacted.value(password) === "too often"
          ? Effect.fail(new TooManyPasswordAttempts())
          : Effect.succeed(Redacted.value(password) === "correct horse"),
    })
  ),
  Layer.effect(
    ConnectedAppStore,
    Effect.gen(function* ConnectedAppStoreTest() {
      const fakes = yield* Fakes;

      return ConnectedAppStore.of({
        list: () =>
          Effect.succeed([
            {
              authorizedAt: at,
              clientId: "acme-cli",
              lastUsedAt: at,
              name: "Acme CLI",
              scopes: ["offline_access", "workspace:write"],
              uri: null,
              workspaces: [],
            },
          ]),
        revoke: (id, clientId) =>
          clientId === "acme-cli"
            ? record(`revoke:${id}:${clientId}`).pipe(
                Effect.provideService(Fakes, fakes),
                Effect.as(true)
              )
            : Effect.succeed(false),
      });
    })
  ),
  Layer.effect(
    AccountMail,
    Effect.gen(function* AccountMailTest() {
      const fakes = yield* Fakes;

      return AccountMail.of({
        deleted: ({ email, locale }) =>
          record(`mail:${email}:${locale}`).pipe(
            Effect.provideService(Fakes, fakes)
          ),
      });
    })
  ),
  Layer.succeed(
    ApiKeyIssuer,
    ApiKeyIssuer.of({
      issue: () => Effect.die("not used"),
      list: () => Effect.succeed([]),
      revoke: () => Effect.die("not used"),
    })
  ),
  Layer.succeed(
    TransactionRunner,
    TransactionRunner.of({ transaction: (effect) => effect })
  )
);

const UseCasesLive = Layer.mergeAll(
  AccountData.layer,
  CloseAccount.layer,
  ConnectedApps.layer,
  DeleteWorkspace.layer
).pipe(Layer.provide(PortsLive));

const HandlersLive = Layer.mergeAll(
  AccountHandlers,
  ConnectedAppsHandlers,
  WorkspacesHandlers
).pipe(Layer.provide(UseCasesLive));

const groups = ["workspaces", "account", "connectedApps"] as const;

const clientWith = <E, R>(
  security: Layer.Layer<Layer.Success<typeof anonymousSecurityTest>, E, R>
) =>
  HttpApiTest.groups(Api, groups).pipe(
    Effect.provide(
      Layer.mergeAll(
        HandlersLive.pipe(Layer.provideMerge(security)),
        HttpServer.layerServices
      )
    )
  );

const user = (
  extra: Partial<Extract<Principal, { readonly _tag: "user" }>> = {}
): Principal => ({ _tag: "user", impersonatedBy: null, userId, ...extra });

const apiKey: Principal = {
  _tag: "apiKey",
  apiKeyId: "5a0b7c9d-8e6f-4da4-9f10-6b7c8d9eafb0",
  permissions: permissionsFor("owner"),
  workspaceId: harbour,
};

const oauth = user({
  oauth: {
    clientId: "acme-cli",
    scopes: ["workspace:write"],
    workspaceId: null,
  },
});

const impersonated = user({ impersonatedBy: otherUserId });

const as = (
  principal: Principal,
  workspaceId: WorkspaceId = harbour,
  role = "owner"
) => {
  const member: Member = {
    permissions: permissionsFor(role),
    principal,
    workspaceId,
  };

  return clientWith(securityTest(member));
};

const calls = Fakes.use(({ calls: made }) => Ref.get(made));

const failureOf = <A, E extends { readonly _tag: string }, R>(
  request: Effect.Effect<A, E, R>
) =>
  request.pipe(
    Effect.flip,
    Effect.map(({ _tag }) => _tag)
  );

layer(Fakes.layer)("the settings endpoints", (it) => {
  it.effect(
    "let an owner, in person, delete the workspace once its name is typed again",
    () =>
      Effect.gen(function* deletes() {
        const client = yield* as(user());
        const params = { workspaceId: harbour };

        assert.strictEqual(
          yield* failureOf(
            client.workspaces.delete({ params, payload: { name: "Harbor" } })
          ),
          "WorkspaceNameMismatch"
        );
        assert.notInclude(yield* calls, `eraseWorkspace:${harbour}`);

        yield* client.workspaces.delete({
          params,
          payload: { name: "Harbour" },
        });

        const done = yield* calls;

        assert.includeMembers(
          [...done],
          [
            `eraseWorkspace:${harbour}`,
            `deleteWorkspace:${harbour}`,
            `removeFiles:${harbour}`,
          ]
        );
      })
  );

  it.effect(
    "refuse to delete the workspace to an admin, an API key, an OAuth client and staff impersonating the owner",
    () =>
      Effect.gen(function* refuses() {
        const before = (yield* calls).length;
        const payload = { name: "Shared" };
        const params = { workspaceId: shared };

        for (const client of [
          yield* as(user(), shared, "admin"),
          yield* as(apiKey, shared),
          yield* as(oauth, shared),
          yield* as(impersonated, shared),
        ]) {
          assert.strictEqual(
            yield* failureOf(client.workspaces.delete({ params, payload })),
            "Forbidden"
          );
        }

        assert.lengthOf(yield* calls, before);

        const anonymous = yield* clientWith(anonymousSecurityTest);

        assert.strictEqual(
          yield* failureOf(anonymous.workspaces.delete({ params, payload })),
          "Unauthenticated"
        );
      })
  );

  it.effect("refuse to delete a workspace while a post goes out", () =>
    Effect.gen(function* refusesBusy() {
      const client = yield* as(user(), busy);

      assert.strictEqual(
        yield* failureOf(
          client.workspaces.delete({
            params: { workspaceId: busy },
            payload: { name: "Busy" },
          })
        ),
        "WorkspaceBusy"
      );
    })
  );

  it.effect("refuse to delete a workspace Stripe may still bill", () =>
    Effect.gen(function* refusesSubscribed() {
      const client = yield* as(user(), subscribed);

      assert.strictEqual(
        yield* failureOf(
          client.workspaces.delete({
            params: { workspaceId: subscribed },
            payload: { name: "Subscribed" },
          })
        ),
        "WorkspaceSubscribed"
      );
      assert.notInclude(yield* calls, `deleteWorkspace:${subscribed}`);
    })
  );

  it.effect("export the user's data as a file, to them in person only", () =>
    Effect.gen(function* exports() {
      const { standings } = yield* Fakes;

      yield* Ref.set(
        standings,
        new Map([
          [
            userId,
            [
              {
                memberRoles: ["owner"],
                role: "owner",
                workspaceId: harbour,
                workspaceName: "Harbour",
              },
              {
                memberRoles: ["owner", "editor"],
                role: "editor",
                workspaceId: shared,
                workspaceName: "Shared",
              },
            ],
          ],
        ])
      );

      const client = yield* as(user());
      const { body, headers } = yield* client.account.export();

      assert.strictEqual(
        headers["content-disposition"],
        `attachment; filename="acme-data-${DateTime.formatIsoDate(body.exportedAt)}.json"`
      );
      assert.strictEqual(body.user.email, "ana@example.test");
      assert.deepStrictEqual(
        body.workspaces.map(({ assistantUsage, billing, name }) => ({
          assistantUsage,
          name,
          plan: billing.plan,
          statuses: billing.subscriptions.map(({ status }) => status),
        })),
        [
          {
            assistantUsage: [{ day: "2026-11-09", requests: 3 }],
            name: "Harbour",
            plan: "pro",
            statuses: ["active"],
          },
        ]
      );
      // Of Shared, only the posts Ana wrote.
      assert.include(yield* calls, `exportAuthored:${userId}:${shared}`);
      assert.deepStrictEqual(
        body.authoredPosts.map(({ text, workspaceId }) => ({
          text,
          workspaceId,
        })),
        [{ text: "A synthetic post of Ana's.", workspaceId: shared }]
      );
      assert.deepStrictEqual(
        body.connectedApps.map(({ clientId }) => clientId),
        ["acme-cli"]
      );

      for (const principal of [apiKey, oauth, impersonated]) {
        const refused = yield* as(principal);

        assert.strictEqual(
          yield* failureOf(refused.account.export()),
          "Forbidden"
        );
      }
    })
  );

  it.effect(
    "delete the account once the password confirms it, unless a workspace would lose its last owner",
    () =>
      Effect.gen(function* closes() {
        const { standings } = yield* Fakes;
        const client = yield* as(user());

        const ownedAlone: MembershipStanding = {
          memberRoles: ["owner", "viewer"],
          role: "owner",
          workspaceId: shared,
          workspaceName: "Shared",
        };

        const alone: MembershipStanding = {
          memberRoles: ["owner"],
          role: "owner",
          workspaceId: harbour,
          workspaceName: "Harbour",
        };

        yield* Ref.set(standings, new Map([[userId, [alone, ownedAlone]]]));

        assert.strictEqual(
          yield* failureOf(
            client.account.delete({ payload: { password: "wrong" } })
          ),
          "IncorrectPassword"
        );

        assert.strictEqual(
          yield* failureOf(
            client.account.delete({ payload: { password: "too often" } })
          ),
          "TooManyPasswordAttempts"
        );

        const lastOwner = yield* client.account
          .delete({ payload: { password: "correct horse" } })
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          lastOwner._tag === "LastOwner" ? lastOwner.workspaces : [],
          [{ id: shared, name: "Shared" }]
        );
        assert.notInclude(yield* calls, `deleteUser:${userId}`);

        for (const principal of [apiKey, oauth, impersonated]) {
          const refused = yield* as(principal);

          assert.strictEqual(
            yield* failureOf(
              refused.account.delete({ payload: { password: "correct horse" } })
            ),
            "Forbidden"
          );
        }

        yield* Ref.set(
          standings,
          new Map([
            [
              userId,
              [alone, { ...ownedAlone, memberRoles: ["owner", "owner"] }],
            ],
          ])
        );

        yield* client.account.delete({
          payload: { password: "correct horse" },
        });

        const done = yield* calls;

        assert.includeMembers(
          [...done],
          [
            `eraseWorkspace:${harbour}`,
            `deleteWorkspace:${harbour}`,
            `eraseUser:${userId}`,
            `deleteUser:${userId}`,
            `removeFiles:${harbour}`,
            "mail:ana@example.test:fr",
          ]
        );
        assert.notInclude(done, `eraseWorkspace:${shared}`);
      })
  );

  it.effect(
    "refuse to delete the account while Stripe may still bill a workspace it would delete",
    () =>
      Effect.gen(function* refusesClosing() {
        const { standings } = yield* Fakes;
        const client = yield* as(user());

        yield* Ref.set(
          standings,
          new Map([
            [
              userId,
              [
                {
                  memberRoles: ["owner"],
                  role: "owner",
                  workspaceId: subscribed,
                  workspaceName: "Subscribed",
                },
              ],
            ],
          ])
        );

        const before = yield* calls;

        assert.strictEqual(
          yield* failureOf(
            client.account.delete({ payload: { password: "correct horse" } })
          ),
          "WorkspaceSubscribed"
        );

        const after = (yield* calls).slice(before.length);

        assert.notInclude(after, `eraseUser:${userId}`);
        assert.notInclude(after, `deleteUser:${userId}`);
      })
  );

  it.effect(
    "list and revoke connected applications, for the user in person",
    () =>
      Effect.gen(function* apps() {
        const client = yield* as(user());
        const listed = yield* client.connectedApps.list();

        assert.deepStrictEqual(
          listed.map(({ clientId, name }) => ({ clientId, name })),
          [{ clientId: "acme-cli", name: "Acme CLI" }]
        );

        assert.strictEqual(
          yield* failureOf(
            client.connectedApps.revoke({ params: { clientId: "unknown" } })
          ),
          "ConnectedAppNotFound"
        );

        yield* client.connectedApps.revoke({
          params: { clientId: "acme-cli" },
        });

        assert.include(yield* calls, `revoke:${userId}:acme-cli`);

        // A client may not see or revoke the others, nor itself.
        const asClient = yield* as(oauth);

        assert.strictEqual(
          yield* failureOf(asClient.connectedApps.list()),
          "Forbidden"
        );
        assert.strictEqual(
          yield* failureOf(
            asClient.connectedApps.revoke({ params: { clientId: "acme-cli" } })
          ),
          "Forbidden"
        );
      })
  );
});
