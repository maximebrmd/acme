import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The platform, or the instance, did not answer or answered with an error of
 * its own: nothing was connected, and trying again later may work.
 */
export class PlatformUnreachable extends Schema.TaggedError<PlatformUnreachable>()(
  "PlatformUnreachable",
  { ...errorEnvelope },
  {
    description:
      "The platform did not answer, or failed on its side. Nothing was connected; try again later.",
    httpApiStatus: 502,
  }
) {}
