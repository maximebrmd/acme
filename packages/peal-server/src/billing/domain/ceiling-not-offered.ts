import { Schema } from "effect";

import { SpendGroupSchema } from "./meter-claims.ts";

/**
 * No ceiling is taken for the group yet: the price of its meters past
 * their allowances is not confirmed, so nothing past them is billed.
 */
export class CeilingNotOffered extends Schema.TaggedError<CeilingNotOffered>()(
  "CeilingNotOffered",
  { group: SpendGroupSchema }
) {}
