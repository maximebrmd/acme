import { Schema } from "effect";

import { LinkAccessSchema } from "#review/domain/review-link.ts";

/** The link does not let its visitors do this. */
export class LinkAccessDenied extends Schema.TaggedError<LinkAccessDenied>()(
  "LinkAccessDenied",
  { needed: LinkAccessSchema }
) {}
