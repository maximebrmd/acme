import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** This server does not bill workspaces: nothing is ordered or cancelled. */
export class BillingNotEnabled extends Schema.TaggedError<BillingNotEnabled>()(
  "BillingNotEnabled",
  { ...errorEnvelope },
  {
    description:
      "This server does not bill workspaces: it has no plans, and nothing to order, cancel or withdraw from.",
    httpApiStatus: 404,
  }
) {}
