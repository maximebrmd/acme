import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";
import type { AccountStanding } from "peal-contract";

import { blueskyLimits } from "#posts/bluesky-account.ts";
import { initialValues } from "#posts/target-options.ts";

// A channel connected before Peal asked for the gates' scopes.
const ungated: AccountStanding = {
  _tag: "read",
  blocked: null,
  restrictions: [
    { _tag: "optionNeedsReconnect", field: "replies" },
    { _tag: "optionNeedsReconnect", field: "disableQuotes" },
  ],
};

describe(blueskyLimits, () => {
  it("closes the gates on a channel that cannot set them, saying to reconnect it", () => {
    const limits = blueskyLimits(
      Option.some(ungated),
      initialValues("bluesky")
    );

    expect([
      ...(limits.get("replies")?.closedChoices?.entries() ?? []),
    ]).toStrictEqual([
      ["nobody", "bluesky.gatesNeedReconnect"],
      ["limited", "bluesky.gatesNeedReconnect"],
    ]);
    expect(limits.get("disableQuotes")?.locked).toBe(
      "bluesky.gatesNeedReconnect"
    );
    expect(limits.has("languages")).toBeFalsy();
  });

  it("keeps a gate the post holds, to be seen and taken off", () => {
    const limits = blueskyLimits(Option.some(ungated), {
      ...initialValues("bluesky"),
      disableQuotes: true,
      replies: "nobody",
    });

    expect([
      ...(limits.get("replies")?.closedChoices?.keys() ?? []),
    ]).toStrictEqual(["limited"]);
    expect(limits.get("disableQuotes")).toStrictEqual({
      note: "bluesky.gatesNeedReconnect",
    });
  });

  it("offers every gate where the channel holds the scopes, or nothing says", () => {
    const granted: AccountStanding = {
      _tag: "read",
      blocked: null,
      restrictions: [],
    };

    expect(
      blueskyLimits(Option.some(granted), initialValues("bluesky")).size
    ).toBe(0);
    expect(blueskyLimits(Option.none(), initialValues("bluesky")).size).toBe(0);
    expect(
      blueskyLimits(
        Option.some({ _tag: "unread", reason: "platformUnreachable" }),
        initialValues("bluesky")
      ).size
    ).toBe(0);
  });
});
