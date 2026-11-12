// What needs attention in a partner's customers' workspaces, on fakes of
// the stores and the overview's sources: the figures by workspace, zeros
// where the credential may read and nothing was found, nothing where it
// may not, and the account's standing on the first page alone.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";

import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { OverviewSources } from "#workspace/application/overview-sources.ts";
import { PartnerHealth } from "#workspace/application/partner-health.ts";
import { PartnerStore } from "#workspace/application/partner-store.ts";
import { PartnerWorkspaces } from "#workspace/application/partner-workspaces.ts";
import { CustomerWorkspace } from "#workspace/domain/customer-workspace.ts";
import {
  PartnerIdSchema,
  PartnerKeyIdSchema,
} from "#workspace/domain/partner-id.ts";
import { PartnerKeyPrincipal } from "#workspace/domain/partner-key-principal.ts";
import { partnerKeyPermissions } from "#workspace/domain/partner-key.ts";
import { Partner } from "#workspace/domain/partner.ts";

const home = WorkspaceIdSchema.make("1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d");

const partnerId = PartnerIdSchema.make("0190f3a0-0000-7000-8000-0000000000c1");

const createdAt = DateTime.makeUnsafe("2026-10-01T09:00:00Z");

const partner = new Partner({
  createdAt,
  id: partnerId,
  logoUrl: Option.none(),
  name: "Synthetic Suite",
  returnOrigins: [],
  updatedAt: createdAt,
  workspaceId: home,
});

const customerId = (last: string): WorkspaceId =>
  WorkspaceIdSchema.make(`3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e${last}`);

const busy = new CustomerWorkspace({
  createdAt,
  externalId: Option.some("customer-busy"),
  id: customerId("01"),
  name: "Busy customer",
  partnerId,
});

const quiet = new CustomerWorkspace({
  createdAt: DateTime.subtract(createdAt, { hours: 1 }),
  externalId: Option.none(),
  id: customerId("02"),
  name: "Quiet customer",
  partnerId,
});

const posts = {
  awaitingApproval: 1,
  failedLast7Days: 2,
  scheduledNext7Days: 3,
  unconfirmedLast7Days: 0,
};

const channels = { connected: 4, off: 1, toReconnect: 2 };

// Which workspaces each source was asked about.
const asked = Ref.makeUnsafe<readonly string[]>([]);

const askedOf = (source: string, ids: readonly WorkspaceId[]) =>
  Ref.update(asked, (all) => [...all, `${source}:${ids.join(",")}`]);

const healthWith = (bills: boolean) =>
  PartnerHealth.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.mock(PartnerStore, {
          get: (id) =>
            Effect.succeed(
              id === partnerId ? Option.some(partner) : Option.none()
            ),
          ofWorkspace: (id) =>
            Effect.succeed(id === home ? Option.some(partner) : Option.none()),
        }),
        Layer.mock(PartnerWorkspaces, {
          listingOf: (_, request) =>
            Effect.succeed(
              Option.isNone(request.before)
                ? {
                    next: Option.some("page-2"),
                    total: 3,
                    workspaces: [busy, quiet],
                  }
                : { next: Option.none(), total: 3, workspaces: [] }
            ),
        }),
        Layer.mock(OverviewSources, {
          bills,
          channels: (ids) =>
            askedOf("channels", ids).pipe(
              Effect.as(new Map([[busy.id, channels]]))
            ),
          overPlan: (ids) =>
            askedOf("overPlan", ids).pipe(Effect.as(new Set(ids))),
          posts: (ids) =>
            askedOf("posts", ids).pipe(Effect.as(new Map([[busy.id, posts]]))),
          unanswered: (ids) =>
            askedOf("unanswered", ids).pipe(Effect.as(new Map([[busy.id, 5]]))),
        })
      )
    )
  );

const keyWith = (
  permissions: readonly Permission[],
  scopes: PartnerKeyPrincipal["scopes"] = ["workspaces:read"]
) =>
  new PartnerKeyPrincipal({
    partnerId,
    partnerKeyId: PartnerKeyIdSchema.make(
      "0190f3a0-0000-7000-8000-0000000000d1"
    ),
    permissions,
    scopes,
  });

const owner = new Actor({
  permissions: ["partner:read"],
  subject: {
    _tag: "user",
    impersonatedBy: Option.none(),
    userId: UserIdSchema.make("4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a"),
  },
  workspaceId: home,
});

const firstPage = { before: Option.none(), limit: Option.some(2) };

describe(PartnerHealth, () => {
  it.effect(
    "gives each customer its figures, zeros where nothing needs attention, and the account first",
    () =>
      Effect.gen(function* figures() {
        yield* Ref.set(asked, []);

        const page = yield* PartnerHealth.use((health) =>
          health.forKey(
            keyWith(["channel:read", "post:read", "engagement:read"]),
            firstPage
          )
        ).pipe(Effect.provide(healthWith(true)));

        assert.deepStrictEqual(
          page.workspaces.map(
            ({ channels: c, inbox, posts: p, workspace }) => ({
              channels: c,
              id: workspace.id,
              inbox,
              posts: p,
            })
          ),
          [
            {
              channels: Option.some(channels),
              id: busy.id,
              inbox: Option.some({ unanswered: 5 }),
              posts: Option.some({ ...posts, mayApprove: false }),
            },
            {
              channels: Option.some({ connected: 0, off: 0, toReconnect: 0 }),
              id: quiet.id,
              inbox: Option.some({ unanswered: 0 }),
              posts: Option.some({
                awaitingApproval: 0,
                failedLast7Days: 0,
                mayApprove: false,
                scheduledNext7Days: 0,
                unconfirmedLast7Days: 0,
              }),
            },
          ]
        );
        assert.deepStrictEqual(
          page.account,
          Option.some({ overPlan: Option.some(true) })
        );
        assert.deepStrictEqual(page.next, Option.some("page-2"));
        assert.strictEqual(page.total, 3);
        // The home workspace is no customer: no source is asked about it.
        assert.isFalse(
          (yield* Ref.get(asked)).some((call) => call.includes(home))
        );
      })
  );

  it.effect(
    "reads no section the key may not read, and asks nothing for it",
    () =>
      Effect.gen(function* withheld() {
        yield* Ref.set(asked, []);

        const page = yield* PartnerHealth.use((health) =>
          health.forKey(keyWith(["channel:read"]), firstPage)
        ).pipe(Effect.provide(healthWith(true)));

        for (const { inbox, posts: p } of page.workspaces) {
          assert.isTrue(Option.isNone(p));
          assert.isTrue(Option.isNone(inbox));
        }

        assert.deepStrictEqual(
          (yield* Ref.get(asked)).map((call) => call.split(":")[0]),
          ["channels", "overPlan"]
        );
      })
  );

  it.effect(
    "answers the account on the first page alone, and none where nothing bills",
    () =>
      Effect.gen(function* account() {
        const later = yield* PartnerHealth.use((health) =>
          health.forKey(keyWith(["post:read"]), {
            ...firstPage,
            before: Option.some("page-2"),
          })
        ).pipe(Effect.provide(healthWith(true)));

        assert.isTrue(Option.isNone(later.account));

        const unbilled = yield* PartnerHealth.use((health) =>
          health.forKey(keyWith(["post:read"]), firstPage)
        ).pipe(Effect.provide(healthWith(false)));

        assert.deepStrictEqual(
          unbilled.account,
          Option.some({ overPlan: Option.none() })
        );
      })
  );

  it.effect(
    "refuses a key without workspaces:read, and a member without partner:read",
    () =>
      Effect.gen(function* refused() {
        const withoutScope = yield* PartnerHealth.use((health) =>
          health.forKey(keyWith(["post:read"], ["workspaces:write"]), firstPage)
        ).pipe(Effect.provide(healthWith(true)), Effect.flip);

        assert.strictEqual(withoutScope._tag, "MissingPartnerScope");

        const withoutPermission = yield* PartnerHealth.use((health) =>
          health.forMember(
            new Actor({
              permissions: ["post:read"],
              subject: owner.subject,
              workspaceId: owner.workspaceId,
            }),
            firstPage
          )
        ).pipe(Effect.provide(healthWith(true)), Effect.flip);

        assert.strictEqual(withoutPermission._tag, "MissingPermission");
      })
  );

  it.effect(
    "shows the home workspace's people every section a partner key could hold",
    () =>
      Effect.gen(function* member() {
        const page = yield* PartnerHealth.use((health) =>
          health.forMember(owner, firstPage)
        ).pipe(Effect.provide(healthWith(true)));

        const [first] = page.workspaces;

        assert.isDefined(first);
        assert.isTrue(Option.isSome(first.channels));
        assert.isTrue(Option.isSome(first.inbox));
        assert.deepStrictEqual(
          first.posts.pipe(Option.map(({ mayApprove }) => mayApprove)),
          Option.some(partnerKeyPermissions.includes("post:approve"))
        );
      })
  );
});
