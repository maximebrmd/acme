import { Schema } from "effect";

/**
 * The order box the member was shown is not the one the server records
 * consent to (`consentVersion`): the page is older than the words. Nothing
 * was ordered; the page, loaded again, shows the current words.
 */
export class ConsentChanged extends Schema.TaggedError<ConsentChanged>()(
  "ConsentChanged",
  { current: Schema.String, shown: Schema.String }
) {}
