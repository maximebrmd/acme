import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** What was sent for a partner account, a partner key or a workspace cannot be kept. */
export class PartnerDetailsInvalid extends Schema.TaggedError<PartnerDetailsInvalid>()(
  "PartnerDetailsInvalid",
  {
    ...errorEnvelope,
    field: Schema.Literals([
      "name",
      "logoUrl",
      "accentColor",
      "returnOrigins",
      "externalId",
      "permissions",
    ]).annotate({ identifier: "PartnerDetailField" }),
  },
  {
    description:
      "A value cannot be kept; `field` names it. A name is empty, too long or holds control characters; a logo is not an HTTPS URL on the default port; an accent colour is not `#RRGGBB`, or has less than 3:1 contrast against white or against `#FAFAF9`; a return origin is not an origin (scheme, host and port: HTTPS, or HTTP on this machine alone), or there are more than a partner registers; a partner key was asked for a permission only people hold. Nothing was saved.",
    httpApiStatus: 422,
  }
) {}
