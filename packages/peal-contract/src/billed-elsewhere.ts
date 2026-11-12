import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The workspace's billing account is billed on another of its
 * workspaces, where plans are ordered.
 */
export class BilledElsewhere extends Schema.TaggedError<BilledElsewhere>()(
  "BilledElsewhere",
  {
    ...errorEnvelope,
    // The billing workspace of the account, where its plan is ordered.
    billingWorkspaceId: Schema.String,
  },
  {
    description:
      "The workspace is on a billing account that another of its workspaces bills (`billingWorkspaceId`): every workspace of the account shares that one's plan, which its members who manage billing order there. Nothing was ordered.",
    httpApiStatus: 409,
  }
) {}
