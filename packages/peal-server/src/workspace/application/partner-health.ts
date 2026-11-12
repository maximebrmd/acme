import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { CustomerWorkspace } from "#workspace/domain/customer-workspace.ts";
import { MissingPartnerScope } from "#workspace/domain/missing-partner-scope.ts";
import { sectionsFor, sectionsHeld } from "#workspace/domain/overview.ts";
import type { OverviewSections } from "#workspace/domain/overview.ts";
import type { PartnerKeyPrincipal } from "#workspace/domain/partner-key-principal.ts";
import type { Partner } from "#workspace/domain/partner.ts";

import type { InvalidWorkspaceCursor } from "./invalid-workspace-cursor.ts";
import { OverviewSources } from "./overview-sources.ts";
import type { ChannelStates, PostAttention } from "./overview-sources.ts";
import { PartnerNotFound } from "./partner-not-found.ts";
import { PartnerStore } from "./partner-store.ts";
import { PartnerWorkspaces } from "./partner-workspaces.ts";

/** Which page of a partner's customers is asked for. */
export interface HealthRequest {
  /** The `next` of the page before, as the list of workspaces gives it. */
  readonly before: Option.Option<string>;
  readonly limit: Option.Option<number>;
}

/** What needs attention in one customer's workspace, as far as one reads. */
export interface CustomerHealth {
  /** None where the credential may not read channels. */
  readonly channels: Option.Option<ChannelStates>;
  /** None where it may not read the inbox. */
  readonly inbox: Option.Option<{ readonly unanswered: number }>;
  /** None where it may not read posts. */
  readonly posts: Option.Option<
    PostAttention & { readonly mayApprove: boolean }
  >;
  readonly workspace: CustomerWorkspace;
}

/** A page of a partner's customers, newest first. */
export interface HealthPage {
  /**
   * The account, on the first page only: whether its workspaces, which
   * share one plan and one channel count, must come back within it; none
   * on a server that does not bill.
   */
  readonly account: Option.Option<{
    readonly overPlan: Option.Option<boolean>;
  }>;
  readonly next: Option.Option<string>;
  /** How many workspaces the partner owns. */
  readonly total: number;
  readonly workspaces: readonly CustomerHealth[];
}

const noPosts: PostAttention = {
  awaitingApproval: 0,
  failedLast7Days: 0,
  scheduledNext7Days: 0,
  unconfirmedLast7Days: 0,
};

const noChannels: ChannelStates = { connected: 0, off: 0, toReconnect: 0 };

// A source is asked about the page's workspaces only where it is read.
const askIf = <A>(
  read: boolean,
  ids: readonly WorkspaceId[],
  source: (
    ids: readonly WorkspaceId[]
  ) => Effect.Effect<ReadonlyMap<WorkspaceId, A>, DatabaseError>
) =>
  read && ids.length > 0
    ? source(ids)
    : Effect.succeed<ReadonlyMap<WorkspaceId, A>>(new Map());

const figureOf = <A>(
  read: boolean,
  found: ReadonlyMap<WorkspaceId, A>,
  workspaceId: WorkspaceId,
  nothing: A
): Option.Option<A> =>
  read ? Option.some(found.get(workspaceId) ?? nothing) : Option.none();

/**
 * What needs attention in each workspace a partner owns: channels to
 * reconnect, posts that failed, threads waiting, for a product's backend
 * with its partner key (`workspaces:read`), each section only where the
 * key holds the permission that reads it (`channel:read`, `post:read`,
 * `engagement:read`), or for the home workspace's people (`partner:read`),
 * each section only where they hold its permission there, as the people's
 * overview gives it, and never that they may approve, as they are members
 * of no customer's workspace. A page of `PartnerWorkspaces.listingOf`, its
 * order and cursor, the home workspace left out, its figures from the
 * overview's set-based sources: never a workspace of another partner.
 */
export class PartnerHealth extends Context.Service<
  PartnerHealth,
  {
    readonly forKey: (
      key: PartnerKeyPrincipal,
      request: HealthRequest
    ) => Effect.Effect<
      HealthPage,
      | DatabaseError
      | InvalidWorkspaceCursor
      | MissingPartnerScope
      | PartnerNotFound
    >;
    readonly forMember: (
      actor: Actor,
      request: HealthRequest
    ) => Effect.Effect<
      HealthPage,
      | DatabaseError
      | InvalidWorkspaceCursor
      | MissingPermission
      | PartnerNotFound
    >;
  }
>()("peal-server/workspace/application/PartnerHealth") {
  static readonly layer = Layer.effect(
    PartnerHealth,
    Effect.gen(function* PartnerHealthLive() {
      const partners = yield* PartnerStore;
      const listing = yield* PartnerWorkspaces;
      const sources = yield* OverviewSources;

      const pageOf = Effect.fn("PartnerHealth.pageOf")(function* pageOf(
        partner: Partner,
        sections: OverviewSections,
        request: HealthRequest
      ) {
        const listed = yield* listing.listingOf(partner.id, {
          before: request.before,
          externalId: Option.none(),
          limit: request.limit,
          name: Option.none(),
        });

        const ids = listed.workspaces.map(({ id }) => id);
        const now = yield* DateTime.now;
        const first = Option.isNone(request.before);

        const found = yield* Effect.all(
          {
            channels: askIf(sections.channels, ids, sources.channels),
            // Its customers have no member and share the pool's plan and
            // channels: one of them stands for every one, the home
            // workspace's members aside. With no customer yet, the home
            // workspace's own standing, which its pool alone holds.
            overPlan:
              first && sources.bills
                ? sources.overPlan(
                    ids.length > 0 ? ids.slice(0, 1) : [partner.workspaceId]
                  )
                : Effect.succeed<ReadonlySet<WorkspaceId>>(new Set()),
            posts: askIf(sections.posts, ids, (asked) =>
              sources.posts(asked, now)
            ),
            unanswered: askIf(sections.inbox, ids, sources.unanswered),
          },
          { concurrency: "unbounded" }
        );

        const page: HealthPage = {
          account: first
            ? Option.some({
                overPlan: sources.bills
                  ? Option.some(found.overPlan.size > 0)
                  : Option.none(),
              })
            : Option.none(),
          next: listed.next,
          total: listed.total,
          workspaces: listed.workspaces.map((workspace): CustomerHealth => ({
            channels: figureOf(
              sections.channels,
              found.channels,
              workspace.id,
              noChannels
            ),
            inbox: figureOf(
              sections.inbox,
              found.unanswered,
              workspace.id,
              0
            ).pipe(Option.map((unanswered) => ({ unanswered }))),
            posts: figureOf(
              sections.posts,
              found.posts,
              workspace.id,
              noPosts
            ).pipe(
              Option.map((counts) => ({
                ...counts,
                mayApprove: sections.mayApprove,
              }))
            ),
            workspace,
          })),
        };

        return page;
      });

      const forKey = Effect.fn("PartnerHealth.forKey")(function* forKey(
        key: PartnerKeyPrincipal,
        request: HealthRequest
      ) {
        if (!key.scopes.includes("workspaces:read")) {
          return yield* new MissingPartnerScope({ scope: "workspaces:read" });
        }

        const partner = yield* partners.get(key.partnerId);

        if (Option.isNone(partner)) {
          return yield* new PartnerNotFound();
        }

        return yield* pageOf(
          partner.value,
          sectionsHeld(key.permissions),
          request
        );
      });

      const forMember = Effect.fn("PartnerHealth.forMember")(
        function* forMember(actor: Actor, request: HealthRequest) {
          yield* Effect.fromResult(authorize(actor, "partner:read"));

          const partner = yield* partners.ofWorkspace(actor.workspaceId);

          if (Option.isNone(partner)) {
            return yield* new PartnerNotFound();
          }

          // What the person may read in the home workspace, as the
          // people's overview gives it: staff acting as them, or a key or
          // an application given less, read less. They are members of no
          // customer's workspace, so they approve nothing there.
          return yield* pageOf(
            partner.value,
            { ...sectionsFor(actor), mayApprove: false },
            request
          );
        }
      );

      return PartnerHealth.of({ forKey, forMember });
    })
  );
}
