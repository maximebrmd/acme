import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration, Option } from "effect";

import { connectChannel, markRefreshNeeded } from "#channels/domain/channel.ts";
import type { TokenLifetime } from "#channels/domain/channel.ts";
import {
  isRefreshDue,
  refreshDueBefore,
  tokenLifetimeOf,
  tokenPolicies,
} from "#channels/domain/token-policy.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

const now = DateTime.makeUnsafe("2026-11-09T10:00:00Z");

const after = (duration: Duration.Input) =>
  DateTime.addDuration(now, Duration.fromInputUnsafe(duration));

const channelWith = (token: TokenLifetime) =>
  connectChannel(
    {
      accountId: "account-1",
      avatarUrl: Option.none(),
      connection: Option.none(),
      displayName: Option.none(),
      handle: "@peal_example",
      id: ChannelIdSchema.make("00000000-0000-7000-8000-000000000001"),
      platform: "x",
      scopes: [],
      token,
      workspaceId: WorkspaceIdSchema.make(
        "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"
      ),
    },
    now
  );

describe(tokenLifetimeOf, () => {
  it("keeps a Mastodon token for good", () => {
    expect(
      tokenLifetimeOf(
        tokenPolicies.mastodon,
        { expiresAt: Option.none(), renewable: false },
        now
      )
    ).toStrictEqual({ _tag: "nonExpiring" });
  });

  it("dates a session from the policy when the platform says nothing", () => {
    expect(
      tokenLifetimeOf(
        tokenPolicies.bluesky,
        { expiresAt: Option.none(), renewable: true },
        now
      )
    ).toStrictEqual({ _tag: "refreshable", expiresAt: after("90 days") });
  });

  it("takes the platform's expiry over the policy's", () => {
    expect(
      tokenLifetimeOf(
        tokenPolicies.x,
        { expiresAt: Option.some(after("1 hour")), renewable: true },
        now
      )
    ).toStrictEqual({ _tag: "refreshable", expiresAt: after("1 hour") });
  });

  it("cannot renew a token that came without the means to", () => {
    expect(
      tokenLifetimeOf(
        tokenPolicies.x,
        { expiresAt: Option.none(), renewable: false },
        now
      )
    ).toStrictEqual({
      _tag: "nonRefreshable",
      expiresAt: after("2 hours"),
      issuedAt: now,
    });
  });

  it("asks a self-serve LinkedIn member to reconnect every 60 days", () => {
    expect(
      tokenLifetimeOf(
        tokenPolicies.linkedin,
        { expiresAt: Option.none(), renewable: true },
        now
      )
    ).toStrictEqual({
      _tag: "nonRefreshable",
      expiresAt: after("60 days"),
      issuedAt: now,
    });
  });
});

describe(refreshDueBefore, () => {
  it("is the policy's lead time from now", () => {
    expect(refreshDueBefore(tokenPolicies.threads, now)).toStrictEqual(
      Option.some(after("7 days"))
    );
  });

  it.each(["x", "tiktok", "youtube"] as const)(
    "is a month ago for %s, whose tokens are renewed as they are used",
    (platform) => {
      expect(refreshDueBefore(tokenPolicies[platform], now)).toStrictEqual(
        Option.some(after("-30 days"))
      );
    }
  );

  it("is a week ahead for Pinterest, whose tokens last 30 days", () => {
    expect(refreshDueBefore(tokenPolicies.pinterest, now)).toStrictEqual(
      Option.some(after("7 days"))
    );
  });

  it("is a week ahead for a LinkedIn page, and none for a profile", () => {
    expect(refreshDueBefore(tokenPolicies.linkedinPage, now)).toStrictEqual(
      Option.some(after("7 days"))
    );
    expect(refreshDueBefore(tokenPolicies.linkedin, now)).toStrictEqual(
      Option.none()
    );
  });

  it("is a month ago for a Google Business Profile location, kept alive as YouTube is", () => {
    expect(refreshDueBefore(tokenPolicies.googleBusiness, now)).toStrictEqual(
      refreshDueBefore(tokenPolicies.youtube, now)
    );
    expect(tokenPolicies.googleBusiness.refresh).toStrictEqual(
      tokenPolicies.youtube.refresh
    );
  });

  it("names every way in whose refresh token works once", () => {
    expect(
      Object.entries(tokenPolicies)
        .flatMap(([name, { refresh }]) =>
          refresh._tag === "refreshToken" && refresh.rotates ? [name] : []
        )
        .toSorted()
    ).toStrictEqual(["bluesky", "blueskyLoopback", "pinterest", "tiktok", "x"]);
  });

  it("is none for tokens that are never refreshed", () => {
    expect(refreshDueBefore(tokenPolicies.mastodon, now)).toStrictEqual(
      Option.none()
    );
  });
});

const refreshable = (expiresAt: DateTime.Utc): TokenLifetime => ({
  _tag: "refreshable",
  expiresAt,
});

describe(isRefreshDue, () => {
  it("is due within the lead time, or past expiry", () => {
    for (const expiresAt of [after("6 days"), after("-1 hour")]) {
      expect(
        isRefreshDue(
          channelWith(refreshable(expiresAt)),
          tokenPolicies.threads,
          now
        )
      ).toBeTruthy();
    }
  });

  it("is not due before the lead time", () => {
    expect(
      isRefreshDue(
        channelWith(refreshable(after("8 days"))),
        tokenPolicies.threads,
        now
      )
    ).toBeFalsy();
  });

  // Hours-long access tokens (X, TikTok, YouTube) are renewed by the call
  // that needs one: a sweep ahead of every expiry would refresh each
  // channel a dozen times a day or more, whether it posts or not.
  it.each(["x", "tiktok", "youtube"] as const)(
    "leaves a token of %s to be renewed when used, until a month unused",
    (platform) => {
      const policy = tokenPolicies[platform];

      for (const expiresAt of [after("1 minute"), after("-29 days")]) {
        expect(
          isRefreshDue(channelWith(refreshable(expiresAt)), policy, now)
        ).toBeFalsy();
      }

      expect(
        isRefreshDue(channelWith(refreshable(after("-30 days"))), policy, now)
      ).toBeTruthy();
    }
  );

  it("sweeps ahead of expiry only the tokens that lapse when nobody renews them", () => {
    const sweeps = Object.fromEntries(
      Object.entries(tokenPolicies).map(([name, { refresh }]) => [
        name,
        refresh._tag === "refreshToken" ? refresh.sweep._tag : "none",
      ])
    );

    expect(sweeps).toStrictEqual({
      bluesky: "beforeExpiry",
      blueskyLoopback: "beforeExpiry",
      facebook: "none",
      googleBusiness: "keepAlive",
      instagram: "none",
      instagramLogin: "beforeExpiry",
      linkedin: "none",
      linkedinPage: "beforeExpiry",
      mastodon: "none",
      pinterest: "beforeExpiry",
      threads: "beforeExpiry",
      tiktok: "keepAlive",
      x: "keepAlive",
      youtube: "keepAlive",
    });

    // What is swept ahead of expiry lasts weeks: a channel comes up once
    // in a run out of thousands, never at every run.
    const sweptAhead = Object.values(tokenPolicies).filter(
      ({ refresh }) =>
        refresh._tag === "refreshToken" && refresh.sweep._tag === "beforeExpiry"
    );

    expect(
      sweptAhead.every(({ lifetime }) =>
        Option.exists(lifetime, (lasts) =>
          Duration.isGreaterThanOrEqualTo(lasts, Duration.days(14))
        )
      )
    ).toBeTruthy();
  });

  it("leaves channels that need reconnecting, or cannot renew, alone", () => {
    expect(
      isRefreshDue(
        markRefreshNeeded(channelWith(refreshable(after("-31 days"))), now),
        tokenPolicies.x,
        now
      )
    ).toBeFalsy();
    expect(
      isRefreshDue(
        channelWith({
          _tag: "nonRefreshable",
          expiresAt: after("1 minute"),
          issuedAt: now,
        }),
        tokenPolicies.threads,
        now
      )
    ).toBeFalsy();
  });
});
