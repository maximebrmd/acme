import { Schema } from "effect";

/** Why a choice of what stays in a workspace over its plan was refused. */
export const ReductionRefusalSchema = Schema.Literals([
  // More channels, or members, kept than the plan allows.
  "tooManyChannels",
  "tooManyMembers",
  // Something kept is not the workspace's.
  "unknownChannel",
  "unknownMember",
  // Whoever chooses must stay a member.
  "selfRequired",
  // Only an owner removes an owner.
  "ownerRequired",
]);

export type ReductionRefusal = typeof ReductionRefusalSchema.Type;

/**
 * What someone chose to keep does not bring the workspace back within its
 * plan, or cannot be kept alone. Nothing was removed.
 */
export class ReductionRefused extends Schema.TaggedError<ReductionRefused>()(
  "ReductionRefused",
  { reason: ReductionRefusalSchema }
) {}
