import { Schema } from "effect";

/**
 * This server opens partner accounts through its staff only: a workspace
 * cannot open one itself.
 */
export class PartnerAccountsClosed extends Schema.TaggedError<PartnerAccountsClosed>()(
  "PartnerAccountsClosed",
  {}
) {}
