import { Duration } from "effect";
import { describe, expect, it } from "vitest";

import {
  keptFor,
  platformCaps,
  retentionOf,
} from "#analytics/domain/analytics-retention.ts";
import { platforms } from "#shared/domain/platform.ts";

describe("how long analytics keeps a platform's numbers", () => {
  it("keeps them two years unless the platform's terms say less", () => {
    expect(Duration.toDays(keptFor)).toBe(730);
    expect(Duration.toDays(retentionOf("mastodon"))).toBe(730);
    expect(Duration.toDays(retentionOf("youtube"))).toBe(730);
  });

  it("keeps a LinkedIn page's a year, and Pinterest's 90 days", () => {
    expect(Duration.toDays(retentionOf("linkedin"))).toBe(365);
    expect(Duration.toDays(retentionOf("pinterest"))).toBe(90);
  });

  it("never keeps a platform's longer than the others'", () => {
    for (const platform of platforms) {
      expect(
        Duration.isLessThanOrEqualTo(retentionOf(platform), keptFor)
      ).toBeTruthy();
    }

    expect(Object.keys(platformCaps).toSorted()).toStrictEqual([
      "googleBusiness",
      "linkedin",
      "pinterest",
    ]);
  });
});
