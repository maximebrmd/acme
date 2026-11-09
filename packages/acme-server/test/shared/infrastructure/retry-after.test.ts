import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration, Option } from "effect";
import { Headers } from "effect/http";

import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";

const now = DateTime.makeUnsafe("2026-06-15T08:00:00Z");

const waitFor = (headers: Record<string, string>) =>
  retryAfterOf(Headers.fromInput(headers), now).pipe(
    Option.map(Duration.toMillis)
  );

describe(retryAfterOf, () => {
  it("reads Retry-After as seconds or as a date", () => {
    expect(waitFor({ "retry-after": "120" })).toStrictEqual(
      Option.some(120_000)
    );
    expect(
      waitFor({ "retry-after": "Mon, 15 Jun 2026 08:05:00 GMT" })
    ).toStrictEqual(Option.some(300_000));
  });

  it("reads Mastodon's reset time, an ISO timestamp", () => {
    expect(
      waitFor({ "x-ratelimit-reset": "2026-06-15T08:02:30.000Z" })
    ).toStrictEqual(Option.some(150_000));
  });

  it("reads an AT Protocol server's reset time, in epoch seconds", () => {
    const resetAt = DateTime.toEpochMillis(now) / 1000 + 60;

    expect(waitFor({ "ratelimit-reset": String(resetAt) })).toStrictEqual(
      Option.some(60_000)
    );
  });

  it("prefers Retry-After, and never waits for a time already past", () => {
    expect(
      waitFor({
        "retry-after": "5",
        "x-ratelimit-reset": "2026-06-15T09:00:00Z",
      })
    ).toStrictEqual(Option.some(5000));
    expect(
      waitFor({ "x-ratelimit-reset": "2026-06-15T07:00:00Z" })
    ).toStrictEqual(Option.some(0));
  });

  it("says nothing when the platform did not", () => {
    expect(waitFor({})).toStrictEqual(Option.none());
    expect(waitFor({ "retry-after": "soon" })).toStrictEqual(Option.none());
  });
});
