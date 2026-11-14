// The contract describes the activity log for every client; the server's
// domain decides it. These keep the two equal.
import { describe, expect, it } from "@effect/vitest";
import { Duration } from "effect";
import {
  activityRetentionDays,
  ActivityViaSchema,
  maxRequestLimitPerMinute,
} from "peal-contract";
import { defaultApiRequestsPerMinute } from "peal-contract/rate-card";

import { ActivityViaSchema as DomainViaSchema } from "#activity/domain/activity-event.ts";
import { activityRetention } from "#activity/domain/activity-retention.ts";
import {
  defaultRequestsPerMinute,
  maxOverridePerMinute,
} from "#activity/domain/rate-limit.ts";

describe("the contract's activity log", () => {
  it("names the ways a request authenticates as the domain does", () => {
    expect(ActivityViaSchema.literals).toStrictEqual(DomainViaSchema.literals);
  });

  it("states the rate limit's setting and staff's largest override as the server applies them", () => {
    expect(defaultApiRequestsPerMinute).toBe(defaultRequestsPerMinute);
    expect(maxRequestLimitPerMinute).toBe(maxOverridePerMinute);
  });

  it("says how long an event is kept", () => {
    expect(Duration.days(activityRetentionDays)).toStrictEqual(
      activityRetention
    );
  });
});
