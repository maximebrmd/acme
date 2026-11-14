import { Schema } from "effect";

/** The application acting for the member may not read or answer the workspace's direct messages: an owner lets it, in person, in the inbox's settings. */
export class MessagesNeedConsent extends Schema.TaggedError<MessagesNeedConsent>()(
  "MessagesNeedConsent",
  {}
) {}
