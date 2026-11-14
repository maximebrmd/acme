import { Schema } from "effect";

/** Only a member signed in in person turns a channel's direct messages on or off, or lets an application read them: not an API key, an application acting for them, or staff acting as them. */
export class MessagesNeedPerson extends Schema.TaggedError<MessagesNeedPerson>()(
  "MessagesNeedPerson",
  {}
) {}
