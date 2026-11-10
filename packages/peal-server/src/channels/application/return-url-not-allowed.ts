import { Schema } from "effect";

/**
 * The link may not send people back there: the address is not one a
 * browser can be sent to, or its origin is not one the workspace's partner
 * registered. A workspace without a partner account returns nowhere.
 */
export class ReturnUrlNotAllowed extends Schema.TaggedError<ReturnUrlNotAllowed>()(
  "ReturnUrlNotAllowed",
  {}
) {}
