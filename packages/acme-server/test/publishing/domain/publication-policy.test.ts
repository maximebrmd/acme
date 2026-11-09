import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration } from "effect";

import {
  decide,
  defaultPublicationPolicy,
  isTooLate,
} from "#publishing/domain/publication-policy.ts";
import type {
  AttemptOutcome,
  PublicationDecision,
} from "#publishing/domain/publication-policy.ts";
import { needsReconnect } from "#publishing/domain/target-settlement.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { UnconfirmedReason } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";

const onTime = Duration.zero;

const first = { attempt: 1, sinceScheduled: onTime };

const retry = (delay: Duration.Duration): PublicationDecision => ({
  _tag: "retry",
  delay,
});

const giveUp = (
  reason:
    | "contentRejected"
    | "mediaRejected"
    | "rateLimited"
    | "tokenExpired"
    | "unavailable",
  code?: string
): PublicationDecision => ({
  _tag: "settle",
  settlement:
    code === undefined
      ? { _tag: "failed", reason }
      : { _tag: "failed", code, reason },
});

const published: AttemptOutcome = {
  _tag: "published",
  permalink: "https://social.example/@acme/1",
  platformPostId: PlatformPostIdSchema.make("1"),
};

describe(decide, () => {
  it("settles a published post", () => {
    expect(decide(published, first)).toStrictEqual({
      _tag: "settle",
      settlement: published,
    });
  });

  it.each<{ reason: UnconfirmedReason }>([
    { reason: "noResponse" },
    { reason: "unreadableResponse" },
    { reason: "interrupted" },
    { reason: "adapterFailure" },
  ])("never retries an unconfirmed post ($reason)", ({ reason }) => {
    const unconfirmed: AttemptOutcome = { _tag: "unconfirmed", reason };

    for (const attempt of [1, 2, 8, 20]) {
      expect(
        decide(unconfirmed, { attempt, sinceScheduled: onTime })
      ).toStrictEqual({
        _tag: "settle",
        settlement: unconfirmed,
      });
    }
  });

  describe("an unavailable platform", () => {
    it.each([
      { attempt: 1, delay: Duration.minutes(1) },
      { attempt: 2, delay: Duration.minutes(5) },
      { attempt: 3, delay: Duration.minutes(15) },
      { attempt: 4, delay: Duration.hours(1) },
      { attempt: 5, delay: Duration.hours(1) },
    ])("waits before attempt $attempt + 1", ({ attempt, delay }) => {
      expect(
        decide(new PlatformUnavailable(), { attempt, sinceScheduled: onTime })
      ).toStrictEqual(retry(delay));
    });

    it.each([6, 7, 100])("gives up after attempt %i", (attempt) => {
      expect(
        decide(new PlatformUnavailable(), { attempt, sinceScheduled: onTime })
      ).toStrictEqual(giveUp("unavailable"));
    });
  });

  describe("a rate limit", () => {
    it("waits as long as the platform asks", () => {
      expect(
        decide(new RateLimited({ retryAfter: Duration.minutes(15) }), first)
      ).toStrictEqual(retry(Duration.minutes(15)));
    });

    it("waits a minute when the platform does not say", () => {
      expect(decide(new RateLimited({}), first)).toStrictEqual(
        retry(Duration.minutes(1))
      );
    });

    it.each([
      { asked: Duration.zero, waits: Duration.seconds(1) },
      { asked: Duration.millis(10), waits: Duration.seconds(1) },
      { asked: Duration.hours(9), waits: Duration.hours(6) },
    ])("keeps the wait between 1 s and 6 h", ({ asked, waits }) => {
      expect(
        decide(new RateLimited({ retryAfter: asked }), first)
      ).toStrictEqual(retry(waits));
    });

    it("retries up to the eighth attempt", () => {
      const limited = new RateLimited({ retryAfter: Duration.minutes(1) });

      expect(
        decide(limited, { attempt: 7, sinceScheduled: onTime })
      ).toStrictEqual(retry(Duration.minutes(1)));
      expect(
        decide(limited, { attempt: 8, sinceScheduled: onTime })
      ).toStrictEqual(giveUp("rateLimited"));
    });

    it("gives up when the retry would start more than a day after the scheduled time", () => {
      const limited = new RateLimited({ retryAfter: Duration.hours(2) });

      expect(
        decide(limited, { attempt: 2, sinceScheduled: Duration.hours(22) })
      ).toStrictEqual(retry(Duration.hours(2)));
      expect(
        decide(limited, {
          attempt: 2,
          sinceScheduled: Duration.sum(Duration.hours(22), Duration.millis(1)),
        })
      ).toStrictEqual(giveUp("rateLimited"));
    });
  });

  it.each([1, 3])(
    "fails a refused token at once, attempt %i, and asks for a reconnect",
    (attempt) => {
      const decision = decide(new TokenExpired(), {
        attempt,
        sinceScheduled: onTime,
      });

      expect(decision).toStrictEqual(giveUp("tokenExpired"));
      expect(
        decision._tag === "settle" && needsReconnect(decision.settlement)
      ).toBeTruthy();
    }
  );

  it("fails refused media at once, with the platform's code", () => {
    expect(
      decide(new MediaRejected({ code: "video_too_long" }), first)
    ).toStrictEqual(giveUp("mediaRejected", "video_too_long"));
  });

  it("fails a refused post at once, with the platform's code", () => {
    expect(decide(new BadRequest({ code: "duplicate" }), first)).toStrictEqual(
      giveUp("contentRejected", "duplicate")
    );
  });

  it.each<{ label: string; outcome: AttemptOutcome }>([
    { label: "published", outcome: published },
    {
      label: "unconfirmed",
      outcome: { _tag: "unconfirmed", reason: "noResponse" },
    },
    { label: "unavailable", outcome: new PlatformUnavailable() },
    { label: "rate limited", outcome: new RateLimited({}) },
    { label: "media rejected", outcome: new MediaRejected({ code: "x" }) },
    { label: "bad request", outcome: new BadRequest({ code: "x" }) },
  ])(
    "asks for a reconnect only for a refused token, not $label",
    ({ outcome }) => {
      const decision = decide(outcome, first);

      expect(
        decision._tag === "settle" && needsReconnect(decision.settlement)
      ).toBeFalsy();
    }
  );

  it("follows the policy it is given", () => {
    const policy = {
      ...defaultPublicationPolicy,
      unavailableBackoff: [Duration.seconds(30)],
    };

    expect(decide(new PlatformUnavailable(), first, policy)).toStrictEqual(
      retry(Duration.seconds(30))
    );
    expect(
      decide(
        new PlatformUnavailable(),
        { attempt: 2, sinceScheduled: onTime },
        policy
      )
    ).toStrictEqual(giveUp("unavailable"));
  });
});

describe(isTooLate, () => {
  const scheduledAt = DateTime.makeUnsafe("2026-06-15T08:00:00Z");

  it.each([
    { late: false, now: "2026-06-15T08:00:00Z" },
    { late: false, now: "2026-06-15T08:59:59Z" },
    { late: false, now: "2026-06-15T09:00:00Z" },
    { late: true, now: "2026-06-15T09:00:00.001Z" },
    { late: true, now: "2026-06-16T08:00:00Z" },
  ])("at $now is late: $late", ({ late, now }) => {
    expect(isTooLate(scheduledAt, DateTime.makeUnsafe(now))).toBe(late);
  });
});
