import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration } from "effect";

import {
  activityRetention,
  isExpired,
  retentionCutoff,
} from "#activity/domain/activity-retention.ts";

const now = DateTime.makeUnsafe("2026-11-10T09:00:00Z");

describe("the activity log's retention", () => {
  it("keeps an event 90 days", () => {
    expect(Duration.toDays(activityRetention)).toBe(90);
    expect(retentionCutoff(now)).toStrictEqual(
      DateTime.makeUnsafe("2026-08-12T09:00:00Z")
    );
  });

  it("keeps an event until the 90 days have passed, and no longer", () => {
    expect(
      isExpired(DateTime.makeUnsafe("2026-08-12T09:00:00Z"), now)
    ).toBeFalsy();
    expect(
      isExpired(DateTime.makeUnsafe("2026-08-12T08:59:59Z"), now)
    ).toBeTruthy();
    expect(isExpired(now, now)).toBeFalsy();
  });
});
