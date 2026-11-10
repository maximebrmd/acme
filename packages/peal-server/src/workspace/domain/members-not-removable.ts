import { Schema } from "effect";

/**
 * The members kept cannot be the workspace's only ones: someone kept is not
 * a member (`unknownMember`), whoever chooses must stay (`selfRequired`),
 * or an owner would be removed by someone who is not one (`ownerRequired`).
 */
export class MembersNotRemovable extends Schema.TaggedError<MembersNotRemovable>()(
  "MembersNotRemovable",
  {
    reason: Schema.Literals(["unknownMember", "selfRequired", "ownerRequired"]),
  }
) {}
