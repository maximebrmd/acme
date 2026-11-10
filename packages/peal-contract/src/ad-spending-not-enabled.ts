import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** No owner of the workspace allowed this ad account to spend through Peal: an owner turns spending on, with a monthly ceiling, in the web app. */
export class AdSpendingNotEnabled extends Schema.TaggedError<AdSpendingNotEnabled>()(
  "AdSpendingNotEnabled",
  { ...errorEnvelope },
  {
    description:
      "No owner of the workspace allowed this ad account to spend through Peal: an owner turns spending on, with a monthly ceiling, in the web app.",
    httpApiStatus: 409,
  }
) {}
