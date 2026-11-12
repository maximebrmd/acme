// The contract describes short links for every client; the server's domain
// decides them. These keep the two equal.
import { describe, expect, it } from "@effect/vitest";
import {
  defaultShortLinkPageSize,
  defaultShortLinkRangeDays,
  maxShortLinkPageSize,
  maxShortLinkRangeDays,
  shortLinkClickRetentionDays,
} from "peal-contract";

import { maxLinksPerPage } from "#shortlinks/application/short-link-reports.ts";
import {
  defaultClickRangeDays,
  maxClickRangeDays,
} from "#shortlinks/domain/click-range.ts";
import { clickRetentionDays } from "#shortlinks/domain/click-retention.ts";

describe("the contract's short links", () => {
  it("states the ranges, the pages and the retention the server keeps", () => {
    expect(maxShortLinkRangeDays).toBe(maxClickRangeDays);
    expect(defaultShortLinkRangeDays).toBe(defaultClickRangeDays);
    expect(shortLinkClickRetentionDays).toBe(clickRetentionDays);
    expect(maxShortLinkPageSize).toBe(maxLinksPerPage);
    expect(defaultShortLinkPageSize).toBe(50);
  });
});
