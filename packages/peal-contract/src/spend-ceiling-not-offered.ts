import { Schema } from "effect";

import { SpendGroupSchema } from "./billing.ts";
import { errorEnvelope } from "./error-envelope.ts";

/**
 * No spending ceiling is taken for the group yet: the price of its meters
 * past their allowances is not confirmed, so nothing past the allowances
 * is billed and a ceiling would change nothing.
 */
export class SpendCeilingNotOffered extends Schema.TaggedError<SpendCeilingNotOffered>()(
  "SpendCeilingNotOffered",
  { ...errorEnvelope, group: SpendGroupSchema },
  {
    description:
      "No spending ceiling is taken for `group` yet: the price of its meters past their monthly allowances is not confirmed, so nothing past the allowances is billed. Nothing was changed.",
    httpApiStatus: 409,
  }
) {}
