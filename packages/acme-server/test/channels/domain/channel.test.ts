import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import {
  Channel,
  disable,
  enable,
  isTokenExpired,
  markRefreshNeeded,
  reconnect,
  reconnectWarning,
  reconnectWarningFrom,
} from "#channels/domain/channel.ts";
import type { ChannelStatus, TokenLifetime } from "#channels/domain/channel.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

const utc = (iso: string): DateTime.Utc => DateTime.makeUnsafe(iso);

// A 60-day token that cannot be renewed, issued on 1 March 2026.
const sixtyDays: TokenLifetime = {
  _tag: "nonRefreshable",
  expiresAt: utc("2026-04-30T00:00:00Z"),
  issuedAt: utc("2026-03-01T00:00:00Z"),
};

const refreshable: TokenLifetime = {
  _tag: "refreshable",
  expiresAt: utc("2026-03-01T02:00:00Z"),
};

const channelWith = (status: ChannelStatus, token: TokenLifetime): Channel =>
  new Channel({
    accountId: "4815162342",
    id: ChannelIdSchema.make("00000000-0000-7000-8000-000000000010"),
    name: "@acme_example",
    platform: "mastodon",
    status,
    token,
    workspaceId: WorkspaceIdSchema.make("00000000-0000-7000-8000-000000000011"),
  });

const isoOf = (instant: Option.Option<DateTime.Utc>) =>
  instant.pipe(Option.map(DateTime.formatIso));

describe(reconnectWarningFrom, () => {
  it("warns a week before a long-lived token expires", () => {
    expect(isoOf(reconnectWarningFrom(sixtyDays))).toStrictEqual(
      Option.some("2026-04-23T00:00:00.000Z")
    );
  });

  it("warns halfway through a token that lasts less than two weeks", () => {
    const twoDays: TokenLifetime = {
      _tag: "nonRefreshable",
      expiresAt: utc("2026-03-03T00:00:00Z"),
      issuedAt: utc("2026-03-01T00:00:00Z"),
    };

    expect(isoOf(reconnectWarningFrom(twoDays))).toStrictEqual(
      Option.some("2026-03-02T00:00:00.000Z")
    );
  });

  it.each([
    { label: "renews itself", token: refreshable },
    { label: "never expires", token: { _tag: "nonExpiring" } as const },
  ])("never warns for a token that $label", ({ token }) => {
    expect(reconnectWarningFrom(token)).toStrictEqual(Option.none());
  });
});

describe(reconnectWarning, () => {
  it.each([
    { expected: Option.none(), now: "2026-04-22T23:59:59Z" },
    {
      expected: Option.some("2026-04-30T00:00:00.000Z"),
      now: "2026-04-23T00:00:00Z",
    },
    {
      expected: Option.some("2026-04-30T00:00:00.000Z"),
      now: "2026-05-02T00:00:00Z",
    },
  ])("tells an active channel at $now", ({ expected, now }) => {
    const channel = channelWith("active", sixtyDays);

    expect(isoOf(reconnectWarning(channel, utc(now)))).toStrictEqual(expected);
  });

  it.each([
    { status: "refreshNeeded" as const, token: sixtyDays },
    { status: "disabled" as const, token: sixtyDays },
    { status: "active" as const, token: refreshable },
  ])(
    "stays quiet for a $status channel with a $token._tag token",
    ({ status, token }) => {
      const channel = channelWith(status, token);

      expect(
        reconnectWarning(channel, utc("2026-04-29T00:00:00Z"))
      ).toStrictEqual(Option.none());
    }
  );
});

describe(isTokenExpired, () => {
  it("expires a token that cannot be renewed at its expiry", () => {
    const channel = channelWith("active", sixtyDays);

    expect(isTokenExpired(channel, utc("2026-04-29T23:59:59Z"))).toBeFalsy();
    expect(isTokenExpired(channel, utc("2026-04-30T00:00:00Z"))).toBeTruthy();
  });

  it("leaves renewing a refreshable token to the refresh", () => {
    expect(
      isTokenExpired(
        channelWith("active", refreshable),
        utc("2026-06-01T00:00:00Z")
      )
    ).toBeFalsy();
  });
});

describe(markRefreshNeeded, () => {
  it("asks an active channel to reconnect", () => {
    expect(markRefreshNeeded(channelWith("active", sixtyDays)).status).toBe(
      "refreshNeeded"
    );
  });

  it("leaves a disabled channel disabled", () => {
    expect(markRefreshNeeded(channelWith("disabled", sixtyDays)).status).toBe(
      "disabled"
    );
  });
});

describe(reconnect, () => {
  it("makes the channel active again with its new token", () => {
    const reconnected = reconnect(
      channelWith("refreshNeeded", sixtyDays),
      refreshable
    );

    expect(reconnected.status).toBe("active");
    expect(reconnected.token).toStrictEqual(refreshable);
  });

  it("keeps a disabled channel disabled", () => {
    const reconnected = reconnect(
      channelWith("disabled", sixtyDays),
      refreshable
    );

    expect(reconnected.status).toBe("disabled");
    expect(reconnected.token).toStrictEqual(refreshable);
  });
});

describe(enable, () => {
  it.each([
    { expected: "active", now: "2026-04-01T00:00:00Z" },
    { expected: "refreshNeeded", now: "2026-05-01T00:00:00Z" },
  ])("turns a disabled channel $expected at $now", ({ expected, now }) => {
    const enabled = enable(disable(channelWith("active", sixtyDays)), utc(now));

    expect(enabled.status).toBe(expected);
  });

  it("leaves a channel that is not disabled as it is", () => {
    const channel = channelWith("refreshNeeded", sixtyDays);

    expect(enable(channel, utc("2026-04-01T00:00:00Z"))).toBe(channel);
  });
});
