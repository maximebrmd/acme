import { assert, layer } from "@effect/vitest";
import {
  Context,
  Deferred,
  Fiber,
  DateTime,
  Effect,
  Layer,
  Option,
  Redacted,
  Ref,
} from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api } from "peal-contract";
import type { Member, Principal } from "peal-contract";

import { actorOf } from "#shared/api/actor.ts";
import { Ids } from "#shared/application/ids.ts";
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
import { BillingUnavailable } from "#workspace/application/billing-unavailable.ts";
import { CloseAccount } from "#workspace/application/close-account.ts";
import { ConnectedAppStore } from "#workspace/application/connected-app-store.ts";
import { ConnectedApps } from "#workspace/application/connected-apps.ts";
import { ContextRecords } from "#workspace/application/context-records.ts";
import { DeleteWorkspace } from "#workspace/application/delete-workspace.ts";
import { ErasureLedger } from "#workspace/application/erasure-ledger.ts";
import { PasswordCheck } from "#workspace/application/password-check.ts";
import { PrivacyDeclaration } from "#workspace/application/privacy-declaration.ts";
import { TooManyPasswordAttempts } from "#workspace/application/too-many-password-attempts.ts";
import { WorkspaceBusy } from "#workspace/application/workspace-busy.ts";
import { WorkspaceSubscribed } from "#workspace/application/workspace-subscribed.ts";
import type { MembershipStanding } from "#workspace/domain/account-closure.ts";
import { undeclared } from "#workspace/domain/operator-declaration.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

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

// Stripe does not answer when its checkouts are expired.
// Subscribed, and a post of it starts going out once Stripe cancelled.
const cancelledThenBusy = WorkspaceIdSchema.make(
  "6b1c8e9f-7a5b-4c93-8edf-5a6b7c8d9e0f"
);

const unreachable = WorkspaceIdSchema.make(
  "7c2d9e1f-0a8b-4fc6-9b32-8d9eafb0c1d2"
);

const names: ReadonlyMap<WorkspaceId, string> = new Map([
  [harbour, "Harbour"],
  [busy, "Busy"],
  [shared, "Shared"],
  [subscribed, "Subscribed"],
  [cancelledThenBusy, "Late"],
  [unreachable, "Unreachable"],
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
    /** What removing a workspace's files waits for, as a test sets it. */
    readonly whileRemovingFiles: Ref.Ref<Effect.Effect<void>>;
  }
>()("test/workspace/api/Fakes") {
  static readonly layer = Layer.effect(
    Fakes,
    Effect.all({
      calls: Ref.make<readonly string[]>([]),
      standings: Ref.make<ReadonlyMap<UserId, readonly MembershipStanding[]>>(
        new Map()
      ),
      whileRemovingFiles: Ref.make<Effect.Effect<void>>(Effect.void),
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
        identification: (id, workspaceIds) =>
          record(`identification:${id}:${workspaceIds.join(",")}`).pipe(
            provide,
            Effect.as(
              Option.some({
                email: "ana@example.test",
                name: "Ana",
                signInMethods: [{ accountId: id, provider: "credential" }],
                stripeCustomerIds: [],
                userId: id,
              })
            )
          ),
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
          if (id === busy || id === cancelledThenBusy) {
            return Effect.fail(new WorkspaceBusy({ workspaceId: id }));
          }

          return record(`eraseWorkspace:${id}`).pipe(provide);
        },
        exportAuthoredPosts: (id, workspaceIds) =>
          record(`exportAuthored:${id}:${workspaceIds.join(",")}`).pipe(
            provide,
            Effect.as(
              workspaceIds.map((workspaceId) => ({
                createdVia: { name: null, via: "web" },
                id: "019a6f10-0000-7000-8000-000000000001",
                media: [],
                scheduledAt: null,
                scheduledVia: null,
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
            activity: [],
            contracts: { orders: [], requests: [], withdrawals: [] },
            legalHold: {
              basis: "Synthetic basis",
              connectionYears: 1,
              connections: [],
              disclosedTo: "Synthetic authorities",
              keptAfterClosure: [{ data: ["name", "email"], years: 5 }],
            },
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
            staffActions: [],
          }),
        exportWorkspace: () =>
          Effect.succeed({
            analytics: [],
            assistantUsage: [{ day: "2026-11-09", requests: 3 }],
            billing: {
              meteredPosts: [
                {
                  month: at,
                  platform: "x",
                  posts: 3,
                  postsWithLinks: 1,
                },
              ],
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
            webhooks: [
              {
                createdAt: at,
                description: "Synthetic receiver",
                enabled: true,
                eventTypes: ["post.published"],
                id: "00000000-0000-7000-8000-000000000061",
                url: "https://hooks.example.com/peal",
              },
            ],
          }),
        holdIdentification: (held) =>
          record(`hold:${held.userId}:${held.email}`).pipe(provide),
        legalRemains: () =>
          Effect.succeed({
            accountYears: 1,
            connectionYears: 1,
            identityYears: 5,
          }),
        removeWorkspaceFiles: (id) =>
          Fakes.use(({ whileRemovingFiles }) =>
            Ref.get(whileRemovingFiles)
          ).pipe(
            Effect.flatten,
            Effect.andThen(record(`removeFiles:${id}`)),
            provide
          ),
        // Stripe may still bill one, until the person agrees to cancel:
        // nothing is cancelled while another refuses.
        settleWorkspaces: (ids, { cancelSubscriptions }) =>
          Effect.gen(function* settle() {
            if (ids.includes(busy)) {
              return yield* new WorkspaceBusy({ workspaceId: busy });
            }

            if (ids.includes(unreachable)) {
              return yield* new BillingUnavailable({
                workspaceId: unreachable,
              });
            }

            const billed = ids.filter(
              (id) => id === subscribed || id === cancelledThenBusy
            );

            if (billed.length > 0 && !cancelSubscriptions) {
              return yield* new WorkspaceSubscribed({
                subscriptions: billed.map((workspaceId) => ({
                  paidUntil: Option.some(at),
                  plan: Option.some("pro" as const),
                  workspaceId,
                })),
              });
            }

            yield* Effect.forEach(
              billed,
              (id) => record(`cancel:${id}`).pipe(provide),
              { discard: true }
            );

            return { subscriptionsCancelled: billed.length };
          }),
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
              clientId: "peal-cli",
              lastUsedAt: at,
              name: "Peal CLI",
              scopes: ["offline_access", "workspace:write"],
              uri: null,
              workspaces: [],
            },
          ]),
        revoke: (id, clientId) =>
          clientId === "peal-cli"
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

      const provide = Effect.provideService(Fakes, fakes);

      return AccountMail.of({
        deleted: ({ email, legalHold, locale, subscriptionsCancelled }) =>
          record(
            `mail:${email}:${locale}:${subscriptionsCancelled}:${legalHold?.identityYears ?? "nothing"}`
          ).pipe(provide),
        exported: ({ email, locale, via }) =>
          record(`mail:exported:${email}:${locale}:${via}`).pipe(provide),
        workspaceDeleted: ({
          email,
          locale,
          subscriptionsCancelled,
          workspaceName,
        }) =>
          record(
            `mail:workspaceDeleted:${email}:${locale}:${workspaceName}:${subscriptionsCancelled}`
          ).pipe(provide),
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
  ),
  // The ledger of erasures, which records what it is told.
  Layer.effect(
    ErasureLedger,
    Effect.gen(function* ErasureLedgerTest() {
      const provide = Effect.provideService(Fakes, yield* Fakes);

      return ErasureLedger.of({
        discard: () => record("ledger:discard").pipe(provide),
        entries: Effect.succeed([]),
        expire: () => Effect.succeed(0),
        record: ({ confirmed, userId: closed, workspaceIds }) =>
          record(
            `ledger:${closed ?? "workspace"}:${workspaceIds.join(",")}:${confirmed ? "confirmed" : "pending"}`
          ).pipe(provide),
        unreadable: Effect.succeed([]),
      });
    })
  ),
  Ids.layerTest,
  // A server that bills, whose operator declared who it is.
  Layer.succeed(
    PrivacyDeclaration,
    PrivacyDeclaration.of({
      bills: true,
      declared: {
        ...undeclared,
        controller: {
          address: null,
          contact: "privacy@example.test",
          dataProtectionOfficer: null,
          name: "Synthetic Operator SAS",
        },
      },
    })
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

// The command line, which the user signs in at their terminal.
const oauth = user({
  oauth: {
    clientId: "peal-cli",
    scopes: ["workspace:write"],
    workspaceId: null,
  },
});

// An MCP client, bound to the workspace the user picked.
const mcpClient = user({
  oauth: {
    clientId: "synthetic-agent",
    scopes: ["workspace:read"],
    workspaceId: harbour,
  },
});

// Another client that is not bound to a workspace.
const otherClient = user({
  oauth: {
    clientId: "synthetic-tool",
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
            "mail:workspaceDeleted:ana@example.test:fr:Harbour:0",
          ]
        );

        // The erasure is in the ledger before it commits, by id only, and
        // confirmed once it has: a restore of the database knows to
        // delete the workspace again.
        const pending = done.indexOf(`ledger:workspace:${harbour}:pending`);

        assert.isAbove(pending, -1);
        assert.isBelow(pending, done.indexOf(`deleteWorkspace:${harbour}`));
        assert.isAbove(
          done.indexOf(`ledger:workspace:${harbour}:confirmed`),
          done.indexOf(`deleteWorkspace:${harbour}`)
        );
        assert.notInclude(done, "ledger:discard");
      })
  );

  it.effect(
    "finish a deletion that committed when its client goes away: the files go, the ledger is confirmed and the owner is told",
    () =>
      Effect.gen(function* abandoned() {
        const fakes = yield* Fakes;

        yield* Ref.set(fakes.calls, []);

        const reached = yield* Deferred.make<true>();
        const released = yield* Deferred.make<true>();

        // The store is slow to remove the files, and the client gives up.
        yield* Ref.set(
          fakes.whileRemovingFiles,
          Deferred.succeed(reached, true).pipe(
            Effect.andThen(Deferred.await(released))
          )
        );

        const owner: Member = {
          permissions: permissionsFor("owner"),
          principal: user(),
          workspaceId: harbour,
        };

        const deleting = yield* DeleteWorkspace.use((deletion) =>
          deletion.delete(
            actorOf(owner),
            new UserPrincipal({ impersonatedBy: Option.none(), userId }),
            "Harbour",
            { cancelSubscriptions: false }
          )
        ).pipe(Effect.provide(UseCasesLive), Effect.forkChild);

        yield* Deferred.await(reached);

        const gone = yield* Fiber.interrupt(deleting).pipe(Effect.forkChild);

        // The interruption lands while the files are still being removed.
        yield* Effect.yieldNow.pipe(Effect.repeat({ times: 20 }));
        yield* Deferred.succeed(released, true);
        yield* Fiber.join(gone);
        yield* Ref.set(fakes.whileRemovingFiles, Effect.void);

        assert.includeMembers(
          [...(yield* calls)],
          [
            `removeFiles:${harbour}`,
            `ledger:workspace:${harbour}:confirmed`,
            "mail:workspaceDeleted:ana@example.test:fr:Harbour:0",
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

  it.effect(
    "refuse to delete a workspace Stripe may still bill, saying what cancelling ends, until the owner agrees to cancel",
    () =>
      Effect.gen(function* refusesSubscribed() {
        const client = yield* as(user(), subscribed);
        const params = { workspaceId: subscribed };

        // A name typed wrong cancels nothing, agreed or not.
        assert.strictEqual(
          yield* failureOf(
            client.workspaces.delete({
              params,
              payload: { cancelSubscriptions: true, name: "Subscribe" },
            })
          ),
          "WorkspaceNameMismatch"
        );
        assert.notInclude(yield* calls, `cancel:${subscribed}`);

        const refused = yield* client.workspaces
          .delete({ params, payload: { name: "Subscribed" } })
          .pipe(Effect.flip);

        assert.deepInclude(refused, {
          _tag: "WorkspaceSubscribed",
          subscriptions: [
            { paidUntil: at, plan: "pro", workspaceId: subscribed },
          ],
        });
        assert.notInclude(yield* calls, `deleteWorkspace:${subscribed}`);

        yield* client.workspaces.delete({
          params,
          payload: { cancelSubscriptions: true, name: "Subscribed" },
        });

        // The erasure is in the ledger before Stripe is asked to cancel:
        // a ledger that cannot be written costs nobody their paid period.
        const made = yield* calls;

        assert.isAbove(
          made.indexOf(`ledger:workspace:${subscribed}:pending`),
          -1
        );
        assert.isBelow(
          made.indexOf(`ledger:workspace:${subscribed}:pending`),
          made.indexOf(`cancel:${subscribed}`)
        );
        assert.includeMembers(
          [...made],
          [
            `cancel:${subscribed}`,
            `eraseWorkspace:${subscribed}`,
            `deleteWorkspace:${subscribed}`,
            `removeFiles:${subscribed}`,
            "mail:workspaceDeleted:ana@example.test:fr:Subscribed:1",
          ]
        );
      })
  );

  it.effect(
    "say the subscription was cancelled when the deletion then fails",
    () =>
      Effect.gen(function* cancelledNotDeleted() {
        const client = yield* as(user(), cancelledThenBusy);

        const failed = yield* client.workspaces
          .delete({
            params: { workspaceId: cancelledThenBusy },
            payload: { cancelSubscriptions: true, name: "Late" },
          })
          .pipe(Effect.flip);

        // Not the bare refusal: Stripe's side cannot be undone, so the
        // person is told it happened.
        assert.deepInclude(failed, {
          _tag: "DeletionIncomplete",
          subscriptionsCancelled: 1,
        });
        assert.include(yield* calls, `cancel:${cancelledThenBusy}`);
        assert.notInclude(yield* calls, `deleteWorkspace:${cancelledThenBusy}`);
      })
  );

  it.effect(
    "answer 503 and delete nothing when Stripe cannot expire a workspace's checkouts",
    () =>
      Effect.gen(function* refusesUnreachable() {
        const client = yield* as(user(), unreachable);

        assert.strictEqual(
          yield* failureOf(
            client.workspaces.delete({
              params: { workspaceId: unreachable },
              payload: { name: "Unreachable" },
            })
          ),
          "BillingUnavailable"
        );
        assert.notInclude(yield* calls, `deleteWorkspace:${unreachable}`);
        // Nothing was erased, so the ledger says nothing was.
        assert.notInclude(
          yield* calls,
          `ledger:workspace:${unreachable}:confirmed`
        );
      })
  );

  it.effect(
    "export the user's data as a file, to them in person or through the command line only",
    () =>
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
          `attachment; filename="peal-data-${DateTime.formatIsoDate(body.exportedAt)}.json"`
        );
        assert.strictEqual(body.user.email, "ana@example.test");
        // With what Article 15(1) lists, in Ana's language, from what the
        // operator declared.
        assert.strictEqual(body.about.language, "fr");
        assert.strictEqual(
          body.about.controller?.contact,
          "privacy@example.test"
        );
        assert.isNull(body.about.processors);
        assert.includeMembers(
          body.about.categories.map(({ id }) => id),
          ["account", "content", "contracts", "legalConnections"]
        );
        assert.deepStrictEqual(
          body.workspaces.map(
            ({ assistantUsage, billing, name, webhooks }) => ({
              assistantUsage,
              name,
              plan: billing.plan,
              statuses: billing.subscriptions.map(({ status }) => status),
              // Where the workspace is told, never the secret that signs it.
              webhooks: webhooks.map(({ url }) => url),
            })
          ),
          [
            {
              assistantUsage: [{ day: "2026-11-09", requests: 3 }],
              name: "Harbour",
              plan: "pro",
              statuses: ["active"],
              webhooks: ["https://hooks.example.com/peal"],
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
          ["peal-cli"]
        );

        const fromTerminal = yield* (yield* as(oauth)).account.export();

        assert.strictEqual(fromTerminal.body.user.email, "ana@example.test");
        // Each copy is told to the account's address, with where it went.
        assert.includeMembers(
          [...(yield* calls)],
          [
            "mail:exported:ana@example.test:fr:web",
            "mail:exported:ana@example.test:fr:commandLine",
          ]
        );

        for (const principal of [
          apiKey,
          mcpClient,
          otherClient,
          impersonated,
        ]) {
          const refused = yield* as(principal);

          assert.strictEqual(
            yield* failureOf(refused.account.export()),
            "Forbidden"
          );
        }
      })
  );

  it.effect(
    "say what deleting the account would leave, to the user in person only",
    () =>
      Effect.gen(function* closure() {
        const client = yield* as(user());

        assert.deepStrictEqual(yield* client.account.closure(), {
          legalHold: { accountYears: 1, connectionYears: 1, identityYears: 5 },
        });

        for (const principal of [
          apiKey,
          oauth,
          mcpClient,
          otherClient,
          impersonated,
        ]) {
          const refused = yield* as(principal);

          assert.strictEqual(
            yield* failureOf(refused.account.closure()),
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
            "mail:ana@example.test:fr:0:5",
            // The closure, with the workspace it deleted, by id only.
            `ledger:${userId}:${harbour}:pending`,
            `ledger:${userId}:${harbour}:confirmed`,
          ]
        );

        // Who held the account is kept for the law, read before the
        // workspace it deletes goes, and kept once everything else went.
        const identified = done.lastIndexOf(
          `identification:${userId}:${harbour}`
        );

        const held = done.lastIndexOf(`hold:${userId}:ana@example.test`);

        assert.isAbove(identified, -1);
        assert.isBelow(
          identified,
          done.lastIndexOf(`eraseWorkspace:${harbour}`)
        );
        assert.isAbove(held, done.lastIndexOf(`deleteUser:${userId}`));
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
        assert.notInclude(after, `hold:${userId}:ana@example.test`);

        // Told to, closing cancels the subscription with the workspace.
        yield* client.account.delete({
          payload: { cancelSubscriptions: true, password: "correct horse" },
        });

        assert.includeMembers(
          [...(yield* calls)],
          [
            `cancel:${subscribed}`,
            `eraseWorkspace:${subscribed}`,
            `deleteUser:${userId}`,
            "mail:ana@example.test:fr:1:5",
          ]
        );
      })
  );

  it.effect(
    "list connected applications to the user and the command line, and revoke them for the user in person",
    () =>
      Effect.gen(function* apps() {
        const client = yield* as(user());
        const listed = yield* client.connectedApps.list();

        assert.deepStrictEqual(
          listed.map(({ clientId, name }) => ({ clientId, name })),
          [{ clientId: "peal-cli", name: "Peal CLI" }]
        );

        assert.strictEqual(
          yield* failureOf(
            client.connectedApps.revoke({ params: { clientId: "unknown" } })
          ),
          "ConnectedAppNotFound"
        );

        yield* client.connectedApps.revoke({
          params: { clientId: "peal-cli" },
        });

        assert.include(yield* calls, `revoke:${userId}:peal-cli`);

        // The command line lists them, but may not revoke the others, nor
        // itself; no other client sees them.
        const fromTerminal = yield* as(oauth);

        assert.deepStrictEqual(
          (yield* fromTerminal.connectedApps.list()).map(
            ({ clientId }) => clientId
          ),
          ["peal-cli"]
        );
        assert.strictEqual(
          yield* failureOf(
            fromTerminal.connectedApps.revoke({
              params: { clientId: "peal-cli" },
            })
          ),
          "Forbidden"
        );

        for (const principal of [mcpClient, otherClient, impersonated]) {
          const refused = yield* as(principal);

          assert.strictEqual(
            yield* failureOf(refused.connectedApps.list()),
            "Forbidden"
          );
        }
      })
  );
});
