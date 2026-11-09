import { Schema } from "effect";

/**
 * The platform could not be reached, or answered that it is down, and the
 * request was not accepted: nothing was published, so trying again later is
 * safe.
 *
 * `code` names a cause publishing tells apart, which only the server's
 * operator can fix: the platform refuses the server's app for now, as X does
 * once the app's credits are used up (`#publishing/domain/own-refusals.ts`).
 * It is kept in workflow histories, so never change one.
 */
export class PlatformUnavailable extends Schema.TaggedError<PlatformUnavailable>()(
  "PlatformUnavailable",
  { code: Schema.optionalKey(Schema.String) }
) {}
