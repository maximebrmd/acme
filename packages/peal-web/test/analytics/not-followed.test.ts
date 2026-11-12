import { describe, expect, it } from "@effect/vitest";
import { Cause } from "effect";

import { notFollowed } from "#analytics/not-followed.ts";

describe(notFollowed, () => {
  it("tells a channel analytics does not follow yet from any other failure", () => {
    expect(notFollowed(Cause.fail({ _tag: "ChannelNotFound" }))).toBeTruthy();
    expect(notFollowed(Cause.fail({ _tag: "Forbidden" }))).toBeFalsy();
    expect(notFollowed(Cause.die("down"))).toBeFalsy();
  });
});
