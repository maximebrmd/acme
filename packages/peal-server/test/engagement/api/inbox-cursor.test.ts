import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import { cursorOf } from "#engagement/api/inbox-view.ts";
import { threadId } from "#test/engagement/support.ts";

// A cursor comes back from a client, which may have made it up: one this
// server could not have issued reads as no cursor, never as a failure of
// the server's.
describe(cursorOf, () => {
  const id = threadId(1);

  it("reads back a cursor the server issued", () => {
    const cursor = cursorOf(`1_1794301200000_${id}`);

    expect(Option.isSome(cursor)).toBeTruthy();
    expect(
      cursor.pipe(
        Option.map(({ lastCommentAt }) => DateTime.formatIso(lastCommentAt))
      )
    ).toStrictEqual(Option.some("2026-11-10T09:00:00.000Z"));
  });

  it.each([
    // Past the year 9999, which the database would refuse.
    `1_253402300800000_${id}`,
    `1_9999999999999999_${id}`,
    `1_8640000000000001_${id}`,
    `1_-5_${id}`,
    `1_12.5_${id}`,
    `2_1794301200000_${id}`,
    "1_1794301200000_not-an-id",
    "",
  ])("takes %s for no cursor", (forged) => {
    expect(Option.isNone(cursorOf(forged))).toBeTruthy();
  });

  it("takes the last instant a thread can have", () => {
    expect(Option.isSome(cursorOf(`0_253402300799999_${id}`))).toBeTruthy();
  });
});
