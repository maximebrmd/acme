import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { consentAnswer, withoutPublishing } from "#auth/consent-scopes.ts";

const drafting = ["openid", "workspace:write", "workspace:publish"];

describe(withoutPublishing, () => {
  it("offers nothing when publishing was not asked for", () => {
    expect(withoutPublishing(["openid", "workspace:write"])).toStrictEqual(
      Option.none()
    );
  });

  it("says what is left: drafts for a client that writes, reading otherwise", () => {
    expect(withoutPublishing(drafting)).toStrictEqual(Option.some("drafts"));
    expect(
      withoutPublishing(["workspace:read", "workspace:publish"])
    ).toStrictEqual(Option.some("reading"));
  });

  it("offers nothing when publishing is all the client asked of the workspace", () => {
    expect(withoutPublishing(["openid", "workspace:publish"])).toStrictEqual(
      Option.none()
    );
  });
});

describe(consentAnswer, () => {
  it("allows everything asked for without naming a scope", () => {
    expect(consentAnswer(drafting, true)).toStrictEqual({ accept: true });
  });

  it("leaves publishing out of the scope sent once unticked", () => {
    expect(consentAnswer(drafting, false)).toStrictEqual({
      accept: true,
      scope: "openid workspace:write",
    });
  });

  it("narrows nothing when there was no choice to make", () => {
    expect(consentAnswer(["openid", "workspace:write"], false)).toStrictEqual({
      accept: true,
    });
    expect(consentAnswer(["openid", "workspace:publish"], false)).toStrictEqual(
      { accept: true }
    );
  });
});
