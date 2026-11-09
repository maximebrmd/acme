import { Result } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

import { LastOwner } from "./last-owner.ts";
import { rolesOf } from "./roles.ts";

/** A workspace the account belongs to, as closing the account reads it. */
export interface MembershipStanding {
  /** The roles of every member, the account's included, as stored. */
  readonly memberRoles: readonly string[];
  /** The account's role there, as stored. */
  readonly role: string;
  readonly workspaceId: WorkspaceId;
  readonly workspaceName: string;
}

/** What closing an account does to the workspaces it belongs to. */
export interface ClosurePlan {
  /** Where it is the only member: deleted with everything in them. */
  readonly deleted: readonly WorkspaceId[];
  /** Where others remain: the account only leaves. */
  readonly left: readonly WorkspaceId[];
}

const isOwner = (role: string): boolean => rolesOf(role).includes("owner");

/**
 * How closing the account leaves each of its workspaces: those where it is
 * the only member are deleted, it leaves the others, unless it is the only
 * owner of one that has other members, which would then have no owner.
 */
export const planClosure = (
  standings: readonly MembershipStanding[]
): Result.Result<ClosurePlan, LastOwner> => {
  const alone = standings.filter(({ memberRoles }) => memberRoles.length <= 1);

  const shared = standings.filter(({ memberRoles }) => memberRoles.length > 1);

  const ownedAlone = shared.filter(
    ({ memberRoles, role }) =>
      isOwner(role) && memberRoles.filter(isOwner).length === 1
  );

  return ownedAlone.length > 0
    ? Result.fail(
        new LastOwner({
          workspaces: ownedAlone.map(({ workspaceId, workspaceName }) => ({
            id: workspaceId,
            name: workspaceName,
          })),
        })
      )
    : Result.succeed({
        deleted: alone.map(({ workspaceId }) => workspaceId),
        left: shared.map(({ workspaceId }) => workspaceId),
      });
};
