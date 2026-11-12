import { describe, expect, it } from "@effect/vitest";

import {
  automatedReaderMarkers,
  isCountedVisit,
} from "#shortlinks/domain/counted-visit.ts";

const browser =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

describe("a counted visit", () => {
  it("is a GET from a browser", () => {
    expect(
      isCountedVisit({ method: "GET", purpose: undefined, userAgent: browser })
    ).toBeTruthy();
  });

  it("is never a HEAD", () => {
    expect(
      isCountedVisit({ method: "HEAD", purpose: undefined, userAgent: browser })
    ).toBeFalsy();
  });

  it("needs a User-Agent", () => {
    expect(
      isCountedVisit({
        method: "GET",
        purpose: undefined,
        userAgent: undefined,
      })
    ).toBeFalsy();
    expect(
      isCountedVisit({ method: "GET", purpose: undefined, userAgent: " " })
    ).toBeFalsy();
  });

  it("is never a prefetch or a preview", () => {
    for (const purpose of ["prefetch", "prefetch;prerender", "preview"]) {
      expect(
        isCountedVisit({ method: "GET", purpose, userAgent: browser })
      ).toBeFalsy();
    }
  });

  it.each(automatedReaderMarkers)(
    "is never from an automated reader naming %s",
    (marker) => {
      expect(
        isCountedVisit({
          method: "GET",
          purpose: undefined,
          userAgent: `Synthetic${marker.toUpperCase()}/1.0`,
        })
      ).toBeFalsy();
    }
  );
});
