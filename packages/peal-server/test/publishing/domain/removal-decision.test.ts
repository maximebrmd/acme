import { describe, expect, it } from "@effect/vitest";
import { Duration } from "effect";

import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { defaultPublicationPolicy } from "#publishing/domain/publication-policy.ts";
import { decideRemoval } from "#publishing/domain/removal-decision.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";

const none = { rateLimited: 0, unavailable: 0 };

describe("deciding after a call that deletes a part", () => {
  it("goes on once the part is off the platform", () => {
    expect(
      decideRemoval({ _tag: "removed", alreadyGone: true }, none)
    ).toStrictEqual({ _tag: "removed", alreadyGone: true });
  });

  it("tries an outage again on the publishing policy's ladder, then fails", () => {
    const delays = defaultPublicationPolicy.unavailableBackoff.map(
      (_, unavailable) =>
        decideRemoval(new PlatformUnavailable(), {
          rateLimited: 0,
          unavailable,
        })
    );

    expect(delays).toStrictEqual(
      defaultPublicationPolicy.unavailableBackoff.map((delay) => ({
        _tag: "retry",
        delay,
        rateLimited: false,
      }))
    );
    expect(
      decideRemoval(new PlatformUnavailable(), {
        rateLimited: 0,
        unavailable: 5,
      })
    ).toStrictEqual({ _tag: "failed", code: "unavailable" });
    // An app refused for its billing keeps its code.
    expect(
      decideRemoval(new PlatformUnavailable({ code: "usage-capped" }), {
        rateLimited: 0,
        unavailable: 5,
      })
    ).toStrictEqual({ _tag: "failed", code: "usage-capped" });
  });

  it("waits as long as the platform asks, within bounds", () => {
    expect(
      decideRemoval(new RateLimited({ retryAfter: Duration.minutes(20) }), none)
    ).toStrictEqual({
      _tag: "retry",
      delay: Duration.minutes(20),
      rateLimited: true,
    });
    expect(
      decideRemoval(new RateLimited({ retryAfter: Duration.days(2) }), none)
    ).toStrictEqual({
      _tag: "retry",
      delay: defaultPublicationPolicy.rateLimit.maximumDelay,
      rateLimited: true,
    });
    expect(
      decideRemoval(new RateLimited({}), {
        rateLimited: defaultPublicationPolicy.rateLimit.maxAttempts - 1,
        unavailable: 0,
      })
    ).toStrictEqual({ _tag: "failed", code: "rateLimited" });
  });

  it("fails at once on a refusal no retry changes", () => {
    expect(
      decideRemoval(new BadRequest({ code: "permissionDenied" }), none)
    ).toStrictEqual({ _tag: "failed", code: "permissionDenied" });
    expect(
      decideRemoval(
        new BadRequest({ code: ownRefusalCodes.channelDisconnected }),
        none
      )
    ).toStrictEqual({ _tag: "failed", code: "channelUnavailable" });
    expect(decideRemoval(new TokenExpired(), none)).toStrictEqual({
      _tag: "failed",
      code: "channelUnavailable",
    });
  });
});
