import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * What was chosen to stay in a workspace over its plan does not bring it
 * back within the plan, or cannot stay alone.
 */
export class ReductionRefused extends Schema.TaggedError<ReductionRefused>()(
  "ReductionRefused",
  {
    ...errorEnvelope,
    reason: Schema.Literals([
      "tooManyChannels",
      "tooManyMembers",
      "unknownChannel",
      "unknownMember",
      "selfRequired",
      "ownerRequired",
      "payerRequired",
    ]),
  },
  {
    description:
      "The choice of what stays was refused, and nothing was removed: more channels or members kept than the plan allows (`tooManyChannels`, `tooManyMembers`), something kept that is not the workspace's (`unknownChannel`, `unknownMember`), whoever chooses not among the members kept (`selfRequired`), an owner removed by someone who is not one (`ownerRequired`), or the owner who pays for the workspace not among the members kept (`payerRequired`): they hand it to another payer first.",
    httpApiStatus: 409,
  }
) {}
