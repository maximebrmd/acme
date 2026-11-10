import { Result } from "effect";

import type { UserId } from "#shared/domain/ids.ts";

import { MembersNotRemovable } from "./members-not-removable.ts";
import { rolesOf } from "./roles.ts";

/** A member, with the role as it is stored. */
export interface SeatedMember {
  readonly role: string;
  readonly userId: UserId;
}

const isOwner = ({ role }: SeatedMember) => rolesOf(role).includes("owner");

/**
 * The members to remove so that only `kept` remain, as someone chooses for
 * a workspace that must come back within its plan's members. Whoever
 * chooses stays, everyone kept is a member, and only an owner removes an
 * owner, as when members are removed one at a time: so an owner always
 * remains.
 */
export const membersToRemove = (
  by: UserId,
  members: readonly SeatedMember[],
  kept: readonly UserId[]
): Result.Result<readonly UserId[], MembersNotRemovable> => {
  const staying = new Set(kept);
  const known = new Set(members.map(({ userId }) => userId));
  const chooser = members.find(({ userId }) => userId === by);

  if (chooser === undefined || kept.some((userId) => !known.has(userId))) {
    return Result.fail(new MembersNotRemovable({ reason: "unknownMember" }));
  }

  if (!staying.has(by)) {
    return Result.fail(new MembersNotRemovable({ reason: "selfRequired" }));
  }

  const leaving = members.filter(({ userId }) => !staying.has(userId));

  if (!isOwner(chooser) && leaving.some(isOwner)) {
    return Result.fail(new MembersNotRemovable({ reason: "ownerRequired" }));
  }

  return Result.succeed(leaving.map(({ userId }) => userId));
};
