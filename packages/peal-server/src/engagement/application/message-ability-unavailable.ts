import { Schema } from "effect";

import { MessageAbilitySchema } from "#engagement/domain/message-abilities.ts";

/** The channel cannot do this with its messages: the server reads none on its platform, or its account must be connected again to allow it. */
export class MessageAbilityUnavailable extends Schema.TaggedError<MessageAbilityUnavailable>()(
  "MessageAbilityUnavailable",
  {
    ability: MessageAbilitySchema,
    standing: Schema.Literals(["reconnect", "unsupported"]),
  }
) {}
