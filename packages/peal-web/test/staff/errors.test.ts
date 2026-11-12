import { describe, expect, it } from "@effect/vitest";
import { Exit } from "effect";
import { HttpApiError } from "effect/http-api";
import {
  AccountsNotMerged,
  BillingAccountNotFound,
  StaffActionRefused,
  UserNotFound,
} from "peal-contract";

import { staffErrorKey } from "#staff/errors.ts";

describe(staffErrorKey, () => {
  it("names nothing when the action worked", () => {
    expect(staffErrorKey(Exit.void)).toStrictEqual(
      staffErrorKey(Exit.succeed(undefined))
    );
    expect(staffErrorKey(Exit.void)._tag).toBe("None");
  });

  it("explains why the server refused", () => {
    const keys = [
      new StaffActionRefused({ reason: "self" }),
      new StaffActionRefused({ reason: "verified" }),
      new UserNotFound(),
      new HttpApiError.NotFound(),
    ].map((error) => staffErrorKey(Exit.fail(error)));

    expect(
      keys.map((key) => (key._tag === "Some" ? key.value : null))
    ).toStrictEqual(["self", "verified", "gone", "notStaff"]);
  });

  it("explains why billing accounts were not merged", () => {
    const keys = [
      new AccountsNotMerged({ reason: "subscribed" }),
      new AccountsNotMerged({ reason: "standalone" }),
      new BillingAccountNotFound(),
    ].map((error) => staffErrorKey(Exit.fail(error)));

    expect(
      keys.map((key) => (key._tag === "Some" ? key.value : null))
    ).toStrictEqual(["mergeSubscribed", "mergeStandalone", "accountGone"]);
  });

  it("calls anything else unknown", () => {
    const key = staffErrorKey(Exit.fail({ _tag: "HttpClientError" }));

    expect(key._tag === "Some" ? key.value : null).toBe("unknown");
  });
});
