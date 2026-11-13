import { Schema } from "effect";

/**
 * The workspace, or the server, already has as many requests under way to
 * workspaces' own text providers as it may: nothing was counted or sent,
 * and the request can be sent again in a moment.
 */
export class OwnTextBusy extends Schema.TaggedError<OwnTextBusy>()(
  "OwnTextBusy",
  {}
) {}
