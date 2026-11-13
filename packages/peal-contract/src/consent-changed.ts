import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The order box the client showed is not the one the server records
 * consent to.
 */
export class ConsentChanged extends Schema.TaggedError<ConsentChanged>()(
  "ConsentChanged",
  {
    ...errorEnvelope,
    // The version of the words the server records consent to now.
    current: Schema.String,
    // The version the order said it showed.
    shown: Schema.String,
  },
  {
    description:
      "The order's `consentVersion`, the words of the box the member ticked, is not the server's (`current`): the page is older than the words. Load it again, read the box, and order again. Nothing was ordered.",
    httpApiStatus: 409,
  }
) {}
