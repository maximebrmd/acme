import { Schema } from "effect";

/** The platform did not do what was asked, and nothing changed in Peal: asking again is safe. */
export class InboxActionFailed extends Schema.TaggedError<InboxActionFailed>()(
  "InboxActionFailed",
  {
    // Why: rateLimited, platformUnavailable, reconnectNeeded, channelUnavailable, commentGone or refused.
    reason: Schema.String,
  },
  {
    description:
      "The platform did not do what was asked, and nothing changed in Peal: asking again is safe.",
    httpApiStatus: 502,
  }
) {}
