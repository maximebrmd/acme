import { Schema } from "effect";

/**
 * The ad account's own spend cap, set at its network, leaves `room` (minor
 * units) once what its boosts already commit is taken off: less than this
 * boost would commit. The cap is raised at the network, never by Peal.
 */
export class AccountSpendCapExceeded extends Schema.TaggedError<AccountSpendCapExceeded>()(
  "AccountSpendCapExceeded",
  { currency: Schema.String, requested: Schema.Int, room: Schema.Int }
) {}
