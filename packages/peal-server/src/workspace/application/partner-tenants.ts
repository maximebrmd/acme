import { Context, Effect, Layer, Option, Schema } from "effect";
import type { DateTime } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { CustomerWorkspace } from "#workspace/domain/customer-workspace.ts";
import { MissingPartnerScope } from "#workspace/domain/missing-partner-scope.ts";
import { PartnerIdSchema } from "#workspace/domain/partner-id.ts";
import type { Partner } from "#workspace/domain/partner.ts";

import { CustomerWorkspaces } from "./customer-workspaces.ts";
import type { InvalidWorkspaceCursor } from "./invalid-workspace-cursor.ts";
import { PartnerNotFound } from "./partner-not-found.ts";
import { PartnerStore } from "./partner-store.ts";
import type { PartnerUsageDay } from "./partner-store.ts";
import { PartnerWorkspaces } from "./partner-workspaces.ts";
import { WorkspaceChannelCounts } from "./workspace-channel-counts.ts";

const decodePartnerId = Schema.decodeUnknownOption(PartnerIdSchema);

/** Which page of the tenants a report asks for. */
export interface TenancyRequest {
  /** The `next` of the page before, as the list of workspaces gives it. */
  readonly before: Option.Option<string>;
  readonly limit: Option.Option<number>;
}

/**
 * A partner key, as the contract describes it: its partner's id and its
 * scopes, unchecked.
 */
export interface TenancyKey {
  readonly partnerId: string;
  readonly scopes: readonly string[];
}

/** One workspace of a partner's report: its home, or a customer's. */
export interface Tenant {
  /** The channels it has connected itself. */
  readonly channels: number;
  /** The partner's own id for its customer; none for the home workspace. */
  readonly externalId: Option.Option<string>;
  readonly home: boolean;
  readonly name: string;
  readonly workspaceId: WorkspaceId;
}

/** What a partner holds, for the report billing makes of it. */
export interface Tenancy {
  /**
   * The account as a whole, on the first page only, so that the pages
   * after it read their own workspaces alone: what it holds now (the
   * workspaces it owns, and the channels connected across them and its
   * home workspace, which one plan holds together), and its home
   * workspace's id then every workspace it owns.
   */
  readonly account: Option.Option<{
    readonly held: { readonly channels: number; readonly workspaces: number };
    readonly workspaceIds: readonly WorkspaceId[];
  }>;
  readonly homeWorkspaceId: WorkspaceId;
  /**
   * A page of its workspaces, newest first, in the order and with the
   * cursor of the list of its workspaces; on the first page, its home
   * workspace comes first, one more than asked.
   */
  readonly page: {
    readonly next: Option.Option<string>;
    /** The workspaces it owns, its home left out. */
    readonly total: number;
    readonly tenants: readonly Tenant[];
  };
  /** The partner account's id, for its days (`daysOf`). */
  readonly partnerId: string;
}

// The page's tenants, its home first when it is the first, with the
// channels each connected itself.
const tenantsOf = (
  partner: Partner,
  name: Option.Option<string>,
  listed: readonly CustomerWorkspace[],
  channels: ReadonlyMap<WorkspaceId, number>
): readonly Tenant[] => [
  ...Option.match(name, {
    onNone: () => [],
    onSome: (homeName): readonly Tenant[] => [
      {
        channels: channels.get(partner.workspaceId) ?? 0,
        externalId: Option.none(),
        home: true,
        name: homeName,
        workspaceId: partner.workspaceId,
      },
    ],
  }),
  ...listed.map((workspace): Tenant => ({
    channels: channels.get(workspace.id) ?? 0,
    externalId: workspace.externalId,
    home: false,
    name: workspace.name,
    workspaceId: workspace.id,
  })),
];

/**
 * The workspaces a partner account owns, with its external ids, and what
 * it held day by day, for billing's report of a partner's usage per
 * tenant: with a partner key holding `workspaces:read`, or for the home
 * workspace's people (partner:read). Billing reads it through a port of
 * its own, so it takes and answers plain values. `daysOf` checks nobody:
 * it reads the days of a partner whose tenancy was read, and answered
 * the partner's id.
 */
export class PartnerTenants extends Context.Service<
  PartnerTenants,
  {
    readonly forKey: (
      key: TenancyKey,
      request: TenancyRequest
    ) => Effect.Effect<
      Tenancy,
      | DatabaseError
      | InvalidWorkspaceCursor
      | MissingPartnerScope
      | PartnerNotFound
    >;
    readonly forMember: (
      actor: Actor,
      request: TenancyRequest
    ) => Effect.Effect<
      Tenancy,
      | DatabaseError
      | InvalidWorkspaceCursor
      | MissingPermission
      | PartnerNotFound
    >;
    /** The partner's daily counts from `from` to `to`, oldest first. */
    readonly daysOf: (
      partnerId: string,
      from: DateTime.Utc,
      to: DateTime.Utc
    ) => Effect.Effect<readonly PartnerUsageDay[], DatabaseError>;
  }
>()("peal-server/workspace/application/PartnerTenants") {
  static readonly layer = Layer.effect(
    PartnerTenants,
    Effect.gen(function* PartnerTenantsLive() {
      const partners = yield* PartnerStore;
      const workspaces = yield* CustomerWorkspaces;
      const listing = yield* PartnerWorkspaces;
      const counts = yield* WorkspaceChannelCounts;

      const tenancyOf = Effect.fn("PartnerTenants.tenancyOf")(
        function* tenancyOf(partner: Partner, request: TenancyRequest) {
          const home = partner.workspaceId;

          const listed = yield* listing.listingOf(partner.id, {
            before: request.before,
            externalId: Option.none(),
            limit: request.limit,
            name: Option.none(),
          });

          const page = { next: listed.next, total: listed.total };

          // A page after the first counts its own workspaces' channels.
          if (Option.isSome(request.before)) {
            const channels = yield* counts.of(
              listed.workspaces.map(({ id }) => id)
            );

            const later: Tenancy = {
              account: Option.none(),
              homeWorkspaceId: home,
              page: {
                ...page,
                tenants: tenantsOf(
                  partner,
                  Option.none(),
                  listed.workspaces,
                  channels
                ),
              },
              partnerId: partner.id,
            };

            return later;
          }

          // The first counts every workspace's channels once: the page's
          // figures and the account's pooled count come from that one.
          const found = yield* Effect.all(
            {
              ids: workspaces.idsOf(partner.id),
              name: workspaces.nameOf(home),
            },
            { concurrency: "unbounded" }
          );

          const workspaceIds = [home, ...found.ids];
          const channels = yield* counts.of(workspaceIds);

          const first: Tenancy = {
            account: Option.some({
              held: {
                channels: [...channels.values()].reduce(
                  (sum, held) => sum + held,
                  0
                ),
                workspaces: found.ids.length,
              },
              workspaceIds,
            }),
            homeWorkspaceId: home,
            page: {
              ...page,
              tenants: tenantsOf(
                partner,
                Option.some(Option.getOrElse(found.name, () => partner.name)),
                listed.workspaces,
                channels
              ),
            },
            partnerId: partner.id,
          };

          return first;
        }
      );

      const forKey = Effect.fn("PartnerTenants.forKey")(function* forKey(
        key: TenancyKey,
        request: TenancyRequest
      ) {
        if (!key.scopes.includes("workspaces:read")) {
          return yield* new MissingPartnerScope({ scope: "workspaces:read" });
        }

        const partner = yield* Option.match(decodePartnerId(key.partnerId), {
          onNone: () => Effect.succeed(Option.none<Partner>()),
          onSome: (partnerId) => partners.get(partnerId),
        });

        if (Option.isNone(partner)) {
          return yield* new PartnerNotFound();
        }

        return yield* tenancyOf(partner.value, request);
      });

      const forMember = Effect.fn("PartnerTenants.forMember")(
        function* forMember(actor: Actor, request: TenancyRequest) {
          yield* Effect.fromResult(authorize(actor, "partner:read"));

          const partner = yield* partners.ofWorkspace(actor.workspaceId);

          if (Option.isNone(partner)) {
            return yield* new PartnerNotFound();
          }

          return yield* tenancyOf(partner.value, request);
        }
      );

      const daysOf = (
        partnerId: string,
        from: DateTime.Utc,
        to: DateTime.Utc
      ) =>
        Option.match(decodePartnerId(partnerId), {
          onNone: () => Effect.succeed([]),
          onSome: (id) => partners.usageBetween(id, from, to),
        });

      return PartnerTenants.of({ daysOf, forKey, forMember });
    })
  );
}
