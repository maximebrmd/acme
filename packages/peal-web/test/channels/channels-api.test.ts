import { describe, expect, it } from "@effect/vitest";
import {
  ChannelNotFound,
  ConnectFailed,
  Forbidden,
  PlanLimitReached,
  PlatformUnreachable,
} from "peal-contract";
import { Exit, Option } from "effect";

import { failureOf } from "#channels/channels-api.ts";

describe(failureOf, () => {
  it("is none when the action worked", () => {
    expect(failureOf(Exit.succeed("done"))).toStrictEqual(Option.none());
  });

  it.each([
    [new ConnectFailed({ reason: "invalidInstance" }), "invalidInstance"],
    [new ConnectFailed({ reason: "accountMismatch" }), "accountMismatch"],
    [new ConnectFailed({ reason: "noAccounts" }), "noAccounts"],
    [new PlatformUnreachable(), "unreachable"],
    [new Forbidden(), "forbidden"],
    [new ChannelNotFound(), "notFound"],
    [new PlanLimitReached({ allowed: 3, limit: "channels" }), "planLimit"],
  ])("explains %o", (failure, key) => {
    expect(failureOf(Exit.fail(failure))).toStrictEqual(Option.some(key));
  });

  it("calls anything else, as a server that is down, unknown", () => {
    expect(failureOf(Exit.die(new Error("offline")))).toStrictEqual(
      Option.some("unknown")
    );
  });
});
