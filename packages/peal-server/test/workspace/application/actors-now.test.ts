import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { ActorsNow } from "#workspace/application/actors-now.ts";
import type { ActorStanding } from "#workspace/application/actors-now.ts";
import { ApiKeyIssuer } from "#workspace/application/api-key-issuer.ts";
import { ConnectedAppStore } from "#workspace/application/connected-app-store.ts";
import type { ClientGrant } from "#workspace/application/connected-app-store.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";
import { PartnerStore } from "#workspace/application/partner-store.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";
import { ApiKey } from "#workspace/domain/api-key.ts";
import type { Membership } from "#workspace/domain/membership.ts";
import {
  PartnerIdSchema,
  PartnerKeyIdSchema,
} from "#workspace/domain/partner-id.ts";
import { PartnerKey } from "#workspace/domain/partner-key.ts";

// Who someone a job acts for is now: as a request of theirs would be
// resolved now, so a lost role, membership, grant or key stops them, and
// nothing kept from when they started counts.

const workspaceId = WorkspaceIdSchema.make(
  "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"
);

const userId = UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7");

const partnerId = PartnerIdSchema.make("0190f3a0-0000-7000-8000-0000000000b1");

const partnerKeyId = PartnerKeyIdSchema.make(
  "0190f3a0-0000-7000-8000-0000000000b2"
);

const apiKeyId = "synthetic-workspace-key";

const now = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

// What the fakes answer, which each test changes.
interface World {
  readonly apiKeys: readonly ApiKey[];
  readonly grant: Option.Option<ClientGrant>;
  readonly membership: Option.Option<Membership>;
  readonly owner: Option.Option<typeof partnerId>;
  readonly partnerKeys: readonly PartnerKey[];
}

const member: Membership = { ban: Option.none(), role: "editor" };

const workspaceKey = (
  permissions: readonly Permission[] = ["post:read", "post:schedule"],
  expiresAt: Option.Option<DateTime.Utc> = Option.none()
) =>
  new ApiKey({
    createdAt: now,
    expiresAt,
    id: apiKeyId,
    name: "Synthetic key",
    permissions,
    start: Option.none(),
    workspaceId,
  });

const partnerKey = new PartnerKey({
  createdAt: now,
  expiresAt: Option.none(),
  id: partnerKeyId,
  name: "Synthetic partner key",
  partnerId,
  permissions: ["post:read", "post:schedule"],
  scopes: [],
  start: "peal_partner_syn",
});

const world = Ref.makeUnsafe<World>({
  apiKeys: [],
  grant: Option.none(),
  membership: Option.some(member),
  owner: Option.none(),
  partnerKeys: [],
});

const read = <A>(f: (state: World) => A) => Ref.get(world).pipe(Effect.map(f));

const fail = (name: string) => () => Effect.die(`${name} is not used here`);

const ActorsNowTest = ActorsNow.layer.pipe(
  Layer.provide(ResolveMember.layer),
  Layer.provide(
    Layer.mergeAll(
      Layer.succeed(
        MemberDirectory,
        MemberDirectory.of({
          account: () => Effect.succeedNone,
          membership: () => read(({ membership }) => membership),
        })
      ),
      Layer.succeed(
        ConnectedAppStore,
        ConnectedAppStore.of({
          grantIn: () => read(({ grant }) => grant),
          list: fail("list"),
          revoke: fail("revoke"),
        })
      ),
      Layer.succeed(
        ApiKeyIssuer,
        ApiKeyIssuer.of({
          issue: fail("issue"),
          list: () => read(({ apiKeys }) => apiKeys),
          revoke: fail("revoke"),
        })
      ),
      Layer.succeed(
        PartnerStore,
        PartnerStore.of({
          addKey: fail("addKey"),
          all: Effect.succeed([]),
          closeOf: fail("closeOf"),
          get: () => Effect.succeedNone,
          keyByDigest: fail("keyByDigest"),
          keys: () => read(({ partnerKeys }) => partnerKeys),
          ofWorkspace: () => Effect.succeedNone,
          open: fail("open"),
          recordUsage: fail("recordUsage"),
          removeKey: fail("removeKey"),
          save: fail("save"),
          usage: fail("usage"),
        })
      ),
      Layer.succeed(
        PartnerOwnership,
        PartnerOwnership.of({
          accountOf: () => Effect.succeedNone,
          allowsReturnTo: () => Effect.succeed(false),
          ensureDeletable: () => Effect.void,
          isHome: () => Effect.succeed(false),
          ownerOf: () =>
            read(({ owner }) =>
              owner.pipe(
                Option.map((id) => ({
                  externalId: Option.none(),
                  homeWorkspaceId: WorkspaceIdSchema.make(
                    "11111111-2222-4333-8444-555555555555"
                  ),
                  partnerId: id,
                }))
              )
            ),
          poolOf: () => Effect.succeedNone,
          presentedAs: () => Effect.succeedNone,
        })
      )
    )
  )
);

const inWorld = (state: Partial<World>) =>
  Ref.set(world, {
    apiKeys: [],
    grant: Option.none(),
    membership: Option.some(member),
    owner: Option.none(),
    partnerKeys: [],
    ...state,
  });

const permissionsOf = (standing: ActorStanding) =>
  standing._tag === "acting" ? standing.actor.permissions : standing._tag;

const schedules = (standing: ActorStanding) =>
  standing._tag === "acting" &&
  standing.actor.permissions.includes("post:schedule");

const actors = <A, E>(test: Effect.Effect<A, E, ActorsNow>) =>
  test.pipe(Effect.provide(ActorsNowTest));

describe(ActorsNow, () => {
  it.effect("acts for a member with the role they hold now", () =>
    actors(
      Effect.gen(function* demoted() {
        const people = yield* ActorsNow;

        yield* inWorld({});

        const editor = yield* people.ofMember(userId, workspaceId);

        yield* inWorld({
          membership: Option.some({ ban: Option.none(), role: "viewer" }),
        });

        const viewer = yield* people.ofMember(userId, workspaceId);

        assert.isTrue(schedules(editor));
        assert.isFalse(schedules(viewer));
        assert.strictEqual(viewer._tag, "acting");
      })
    )
  );

  it.effect("finds a member removed, or banned, gone", () =>
    actors(
      Effect.gen(function* removed() {
        const people = yield* ActorsNow;

        yield* inWorld({ membership: Option.none() });

        const left = yield* people.ofMember(userId, workspaceId);

        yield* inWorld({
          membership: Option.some({
            ban: Option.some({ expiresAt: Option.none() }),
            role: "owner",
          }),
        });

        const banned = yield* people.ofMember(userId, workspaceId);

        assert.deepStrictEqual(
          [left, banned],
          [{ _tag: "gone" }, { _tag: "gone" }]
        );
      })
    )
  );

  it.effect(
    "acts for an application with its grant now, and finds it gone once withdrawn",
    () =>
      actors(
        Effect.gen(function* applications() {
          const people = yield* ActorsNow;

          yield* inWorld({
            grant: Option.some({
              bound: true,
              scopes: ["workspace:publish", "workspace:write"],
            }),
          });

          const publishing = yield* people.ofApplication(
            userId,
            "synthetic-client",
            workspaceId
          );

          yield* inWorld({
            grant: Option.some({ bound: true, scopes: ["workspace:write"] }),
          });

          const writing = yield* people.ofApplication(
            userId,
            "synthetic-client",
            workspaceId
          );

          yield* inWorld({ grant: Option.none() });

          const withdrawn = yield* people.ofApplication(
            userId,
            "synthetic-client",
            workspaceId
          );

          assert.isTrue(schedules(publishing));
          assert.isTrue(
            publishing._tag === "acting" &&
              publishing.actor.subject._tag === "user" &&
              publishing.actor.subject.clientId === "synthetic-client"
          );
          assert.isFalse(schedules(writing));
          assert.deepStrictEqual(withdrawn, { _tag: "gone" });
        })
      )
  );

  it.effect(
    "acts for a workspace key with its permissions, and finds it gone once revoked or expired",
    () =>
      actors(
        Effect.gen(function* keys() {
          const people = yield* ActorsNow;

          yield* inWorld({ apiKeys: [workspaceKey()] });

          const valid = yield* people.ofKey(apiKeyId, workspaceId);

          yield* inWorld({ apiKeys: [workspaceKey(["post:read"])] });

          const narrowed = yield* people.ofKey(apiKeyId, workspaceId);

          yield* inWorld({
            apiKeys: [
              workspaceKey(
                ["post:schedule"],
                Option.some(DateTime.makeUnsafe("1970-01-01T00:00:00Z"))
              ),
            ],
          });

          const expired = yield* people.ofKey(apiKeyId, workspaceId);

          yield* inWorld({ apiKeys: [] });

          const revoked = yield* people.ofKey(apiKeyId, workspaceId);

          assert.deepStrictEqual(permissionsOf(valid), [
            "post:read",
            "post:schedule",
          ]);
          assert.deepStrictEqual(permissionsOf(narrowed), ["post:read"]);
          assert.deepStrictEqual(
            [expired, revoked],
            [{ _tag: "gone" }, { _tag: "gone" }]
          );
        })
      )
  );

  it.effect("acts for a partner key while its partner owns the workspace", () =>
    actors(
      Effect.gen(function* partners() {
        const people = yield* ActorsNow;

        yield* inWorld({
          owner: Option.some(partnerId),
          partnerKeys: [partnerKey],
        });

        const owning = yield* people.ofKey(partnerKeyId, workspaceId);

        yield* inWorld({ owner: Option.none(), partnerKeys: [partnerKey] });

        const offboarded = yield* people.ofKey(partnerKeyId, workspaceId);

        yield* inWorld({ owner: Option.some(partnerId), partnerKeys: [] });

        const revoked = yield* people.ofKey(partnerKeyId, workspaceId);

        assert.isTrue(schedules(owning));
        assert.deepStrictEqual(
          [offboarded, revoked],
          [{ _tag: "gone" }, { _tag: "gone" }]
        );
      })
    )
  );
});
