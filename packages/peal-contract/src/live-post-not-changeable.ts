import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";
import { LivePostRefusalSchema } from "./live-post-changes.ts";

/**
 * The post cannot be changed on that channel now: `reason` says why
 * (`LivePostRefusal`).
 */
export class LivePostNotChangeable extends Schema.TaggedError<LivePostNotChangeable>()(
  "LivePostNotChangeable",
  { ...errorEnvelope, reason: LivePostRefusalSchema },
  {
    description:
      "The post cannot be changed on that channel now. `reason` says why: `notPublished` (not live there), `alreadyRemoved`, `noPlatformId` (Peal has no id for it, as for a post confirmed by hand), `notSupported` (the platform's capabilities say why), `changeInProgress`, `channelUnavailable` (disconnected, turned off or to reconnect) or `boostRunning` (stop the boost first).",
    httpApiStatus: 409,
  }
) {}
