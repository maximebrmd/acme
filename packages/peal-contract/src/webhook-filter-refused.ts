import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * A filter the endpoint cannot take: `workspaceIds` on an endpoint of the
 * `workspace` scope, which hears its own workspace only, or a list that is
 * not one of ids.
 */
export class WebhookFilterRefused extends Schema.TaggedError<WebhookFilterRefused>()(
  "WebhookFilterRefused",
  {
    ...errorEnvelope,
    // The filter refused.
    field: Schema.Literals(["channelIds", "workspaceIds"]),
  },
  {
    description:
      "Only an endpoint of the `partner` scope hears more than its own workspace, so only it takes `workspaceIds`; a filter is a list of ids, so many at most. `field` names the filter refused: nothing was saved.",
    httpApiStatus: 422,
  }
) {}
