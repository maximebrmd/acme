import { Option, Order, Result, Schema } from "effect";

import type { Actor, Permission } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

import type { WorkspaceMembership } from "./account.ts";
import { PersonRequired } from "./person-required.ts";
import type { UserPrincipal } from "./user-principal.ts";

/**
 * The person reading across their workspaces: a user, in their own
 * session, impersonated by staff, or through an OAuth client that is bound
 * to no workspace, as the command line's is. A token bound to one
 * workspace reads that one only, as every group under `/api/me` says, and
 * keys belong to workspaces, not to anyone: the handler refuses them
 * before this.
 */
export const overviewReader = (
  principal: UserPrincipal
): Result.Result<UserPrincipal, PersonRequired> =>
  Option.exists(principal.oauth, ({ workspaceId }) =>
    Option.isSome(workspaceId)
  )
    ? Result.fail(new PersonRequired())
    : Result.succeed(principal);

/**
 * Where a page of workspaces ended: its last workspace's name and id. The
 * list is ordered by name, then by id, so a page continues after it
 * whatever was renamed, joined or left meanwhile.
 */
export const WorkspacePositionSchema = Schema.Struct({
  name: Schema.String,
  workspaceId: WorkspaceIdSchema,
});

export type WorkspacePosition = typeof WorkspacePositionSchema.Type;

const positionOf = ({ id, name }: WorkspaceMembership): WorkspacePosition => ({
  name,
  workspaceId: id,
});

// By name, then by id, compared by code unit: the same order on every
// server, whatever its locale.
const byNameThenId: Order.Order<WorkspacePosition> = Order.combine(
  Order.mapInput(Order.String, ({ name }: WorkspacePosition) => name),
  Order.mapInput(
    Order.String,
    ({ workspaceId }: WorkspacePosition) => workspaceId
  )
);

/** A page of the workspaces, and where the next starts, if one follows. */
export interface WorkspacePage {
  readonly next: Option.Option<WorkspacePosition>;
  readonly workspaces: readonly WorkspaceMembership[];
}

/**
 * The page of `limit` workspaces after `after`, by name then id.
 */
export const workspacePage = (
  workspaces: readonly WorkspaceMembership[],
  after: Option.Option<WorkspacePosition>,
  limit: number
): WorkspacePage => {
  const ordered = workspaces
    .filter((workspace) =>
      Option.match(after, {
        onNone: () => true,
        onSome: (position) =>
          Order.isGreaterThan(byNameThenId)(positionOf(workspace), position),
      })
    )
    .toSorted((first, second) =>
      byNameThenId(positionOf(first), positionOf(second))
    );

  const page = ordered.slice(0, limit);
  const last = page.at(-1);

  return {
    next:
      ordered.length > limit && last !== undefined
        ? Option.some(positionOf(last))
        : Option.none(),
    workspaces: page,
  };
};

/**
 * Which of the overview's sections a member may read in a workspace: each
 * the permission its own page checks. Where the permission is missing the
 * section is not read at all, which is not the same as nothing to show.
 * The standing against the plan is told to every member, as the billing
 * page's standing is.
 */
export interface OverviewSections {
  readonly channels: boolean;
  readonly inbox: boolean;
  readonly mayApprove: boolean;
  readonly posts: boolean;
}

/** The sections these permissions read, as a page of each checks them. */
export const sectionsHeld = (
  permissions: readonly Permission[]
): OverviewSections => ({
  channels: permissions.includes("channel:read"),
  inbox: permissions.includes("engagement:read"),
  mayApprove: permissions.includes("post:approve"),
  posts: permissions.includes("post:read"),
});

export const sectionsFor = (actor: Actor): OverviewSections =>
  sectionsHeld(actor.permissions);
