import { Schema } from "effect";

import { PartnerScopeSchema } from "./partner-key.ts";

/** The partner key was not given this scope. */
export class MissingPartnerScope extends Schema.TaggedError<MissingPartnerScope>()(
  "MissingPartnerScope",
  { scope: PartnerScopeSchema }
) {}
