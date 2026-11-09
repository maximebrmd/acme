import { describe, expect, it } from "@effect/vitest";
import { Option, Result } from "effect";

import { roomForOneMore } from "#shared/domain/allowance.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

describe(roomForOneMore, () => {
  it("lets one more in while the allowance has room", () => {
    expect(
      Result.isSuccess(roomForOneMore("channels", Option.some(3), 2))
    ).toBeTruthy();
  });

  it("refuses one more once the allowance is used up, or more than used", () => {
    expect(roomForOneMore("channels", Option.some(3), 3)).toStrictEqual(
      Result.fail(new PlanLimitReached({ allowed: 3, limit: "channels" }))
    );
    expect(roomForOneMore("members", Option.some(2), 5)).toStrictEqual(
      Result.fail(new PlanLimitReached({ allowed: 2, limit: "members" }))
    );
  });

  it("lets anything in without an allowance", () => {
    expect(
      Result.isSuccess(roomForOneMore("scheduledPosts", Option.none(), 10_000))
    ).toBeTruthy();
  });
});
