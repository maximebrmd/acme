import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration } from "effect";

import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import {
  decide,
  defaultPublicationPolicy,
  failureReasonOf,
  isTooLate,
} from "#publishing/domain/publication-policy.ts";
import type {
  AttemptContext,
  AttemptOutcome,
  EarlierRefusals,
  PublicationDecision,
  RefusalReason,
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

const startedAt = DateTime.makeUnsafe("2026-06-15T08:00:00Z");

// After earlier attempts refused as `earlier` says, none by default.
const after = (
  earlier: Partial<EarlierRefusals> = {},
  sinceScheduled = onTime
): AttemptContext => ({
  earlier: { rateLimited: 0, unavailable: 0, ...earlier },
  sinceScheduled,
  startedAt,
});

const first = after();

const retry = (delay: Duration.Duration): PublicationDecision => ({
  _tag: "retry",
  delay,
});

const giveUp = (reason: RefusalReason, code?: string): PublicationDecision => ({
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

    for (const earlier of [0, 1, 7, 20]) {
      expect(
        decide(
          unconfirmed,
          after({ rateLimited: earlier, unavailable: earlier })
        )
      ).toStrictEqual({
        _tag: "settle",
        settlement: { _tag: "unconfirmed", attemptedAt: startedAt, reason },
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
        decide(new PlatformUnavailable(), after({ unavailable: attempt - 1 }))
      ).toStrictEqual(retry(delay));
    });

    it.each([6, 7, 100])("gives up after attempt %i", (attempt) => {
      expect(
        decide(new PlatformUnavailable(), after({ unavailable: attempt - 1 }))
      ).toStrictEqual(giveUp("unavailable"));
    });

    it("counts only the attempts the platform was unavailable for", () => {
      expect(
        decide(new PlatformUnavailable(), after({ rateLimited: 5 }))
      ).toStrictEqual(retry(Duration.minutes(1)));
      expect(
        decide(new PlatformUnavailable(), after({ rateLimited: 1 }))
      ).toStrictEqual(retry(Duration.minutes(1)));
      expect(
        decide(
          new PlatformUnavailable(),
          after({ rateLimited: 7, unavailable: 4 })
        )
      ).toStrictEqual(retry(Duration.hours(1)));
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

      expect(decide(limited, after({ rateLimited: 6 }))).toStrictEqual(
        retry(Duration.minutes(1))
      );
      expect(decide(limited, after({ rateLimited: 7 }))).toStrictEqual(
        giveUp("rateLimited")
      );
    });

    it("counts only the attempts that were rate limited", () => {
      const limited = new RateLimited({ retryAfter: Duration.minutes(1) });

      expect(
        decide(limited, after({ rateLimited: 2, unavailable: 5 }))
      ).toStrictEqual(retry(Duration.minutes(1)));
      expect(
        decide(limited, after({ rateLimited: 6, unavailable: 5 }))
      ).toStrictEqual(retry(Duration.minutes(1)));
      expect(
        decide(limited, after({ rateLimited: 7, unavailable: 1 }))
      ).toStrictEqual(giveUp("rateLimited"));
    });

    it("gives up when the retry would start more than a day after the scheduled time", () => {
      const limited = new RateLimited({ retryAfter: Duration.hours(2) });

      expect(
        decide(limited, after({ rateLimited: 1 }, Duration.hours(22)))
      ).toStrictEqual(retry(Duration.hours(2)));
      expect(
        decide(
          limited,
          after(
            { rateLimited: 1 },
            Duration.sum(Duration.hours(22), Duration.millis(1))
          )
        )
      ).toStrictEqual(giveUp("rateLimited"));
    });
  });

  it.each([0, 2])(
    "fails a refused token at once, after %i refusals, and asks for a reconnect",
    (earlier) => {
      const decision = decide(
        new TokenExpired(),
        after({ rateLimited: earlier, unavailable: earlier })
      );

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

  it.each<{ outcome: BadRequest | MediaRejected; reason: RefusalReason }>([
    {
      outcome: new BadRequest({ code: ownRefusalCodes.channelDisconnected }),
      reason: "channelDisconnected",
    },
    {
      outcome: new BadRequest({ code: ownRefusalCodes.channelDisabled }),
      reason: "channelDisabled",
    },
    {
      outcome: new MediaRejected({ code: ownRefusalCodes.mediaRemoved }),
      reason: "mediaRemoved",
    },
  ])(
    "fails at once with $reason when Acme could not use the channel or media",
    ({ outcome, reason }) => {
      expect(decide(outcome, first)).toStrictEqual(
        giveUp(reason, outcome.code)
      );
    }
  );

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
      decide(new PlatformUnavailable(), after({ unavailable: 1 }), policy)
    ).toStrictEqual(giveUp("unavailable"));
  });
});

describe(failureReasonOf, () => {
  it.each<{ outcome: Parameters<typeof failureReasonOf>[0]; reason: string }>([
    {
      outcome: new BadRequest({ code: "duplicate" }),
      reason: "contentRejected",
    },
    {
      outcome: new BadRequest({ code: ownRefusalCodes.channelDisconnected }),
      reason: "channelDisconnected",
    },
    {
      outcome: new BadRequest({ code: ownRefusalCodes.channelDisabled }),
      reason: "channelDisabled",
    },
    {
      outcome: new MediaRejected({ code: "too_large" }),
      reason: "mediaRejected",
    },
    {
      outcome: new MediaRejected({ code: ownRefusalCodes.mediaRemoved }),
      reason: "mediaRemoved",
    },
    { outcome: new PlatformUnavailable(), reason: "unavailable" },
    { outcome: new RateLimited({}), reason: "rateLimited" },
    { outcome: new TokenExpired(), reason: "tokenExpired" },
  ])("names $reason for a refusal", ({ outcome, reason }) => {
    expect(failureReasonOf(outcome)).toBe(reason);
  });

  it("keeps a platform code that only looks like Acme's for another kind", () => {
    // A platform's media code is never read as a channel Acme could not use.
    expect(
      failureReasonOf(
        new MediaRejected({ code: ownRefusalCodes.channelDisconnected })
      )
    ).toBe("mediaRejected");
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
