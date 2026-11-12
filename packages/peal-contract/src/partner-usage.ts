import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { InvalidDateRange } from "./invalid-date-range.ts";
import {
  partnerUsageDescription,
  partnerUsageQuery,
  PartnerUsageReportSchema,
} from "./usage.ts";

/**
 * What a partner account used, per customer, for its backend, with a
 * partner key: the same report its home workspace's people read at
 * `GET /api/workspaces/{workspaceId}/usage/partner`.
 */
export class PartnerUsageApi extends HttpApiGroup.make("partnerUsage")
  .add(
    HttpApiEndpoint.get("get", "/", {
      error: [Forbidden, InvalidDateRange, HttpApiError.BadRequest],
      query: partnerUsageQuery,
      success: PartnerUsageReportSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `${partnerUsageDescription} Needs the scope workspaces:read. Takes a partner key (\`Authorization: Bearer peal_partner_…\`): any other credential answers 403.`,
        summary: "Get the partner's usage per customer",
      })
    )
  )
  .middleware(Authentication)
  .prefix("/api/partner/usage") {}
