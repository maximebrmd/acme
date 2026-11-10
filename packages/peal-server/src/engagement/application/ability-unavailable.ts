import { Schema } from "effect";

import { EngagementAbilitySchema } from "#engagement/domain/engagement-abilities.ts";

/** The channel cannot do this: its platform does not offer it, or its account must be connected again to allow it. */
export class AbilityUnavailable extends Schema.TaggedError<AbilityUnavailable>()(
  "AbilityUnavailable",
  {
    ability: EngagementAbilitySchema,
    standing: Schema.Literals(["reconnect", "unsupported"]),
  }
) {}
