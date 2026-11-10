import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  consentAnswer,
  mayLeaveAdsOut,
  withoutPublishing,
} from "#auth/consent-scopes.ts";

const drafting = ["openid", "workspace:write", "workspace:publish"];

const advertising = [...drafting, "workspace:ads"];

const everything = { ads: true, publishing: true };

const withoutPublish = { ads: true, publishing: false };

const withoutAds = { ads: false, publishing: true };

const nothing = { ads: false, publishing: false };

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
    expect(consentAnswer(drafting, everything)).toStrictEqual({ accept: true });
  });

  it("leaves publishing out of the scope sent once unticked", () => {
    expect(consentAnswer(drafting, withoutPublish)).toStrictEqual({
      accept: true,
      scope: "openid workspace:write",
    });
  });

  it("narrows nothing when there was no choice to make", () => {
    expect(consentAnswer(["openid", "workspace:write"], nothing)).toStrictEqual(
      {
        accept: true,
      }
    );
    expect(
      consentAnswer(["openid", "workspace:publish"], nothing)
    ).toStrictEqual({ accept: true });
  });
});

describe(mayLeaveAdsOut, () => {
  it("offers nothing when ads were not asked for", () => {
    expect(mayLeaveAdsOut(drafting)).toBeFalsy();
  });

  it("lets ads be left out of what else was asked of the workspace", () => {
    expect(mayLeaveAdsOut(advertising)).toBeTruthy();
    expect(mayLeaveAdsOut(["workspace:read", "workspace:ads"])).toBeTruthy();
  });

  it("offers nothing when ads are all the client asked of the workspace", () => {
    expect(mayLeaveAdsOut(["openid", "workspace:ads"])).toBeFalsy();
  });
});

describe("consentAnswer with ads", () => {
  it("allows ads with the rest without naming a scope", () => {
    expect(consentAnswer(advertising, everything)).toStrictEqual({
      accept: true,
    });
  });

  it("leaves ads out of the scope sent once unticked", () => {
    expect(consentAnswer(advertising, withoutAds)).toStrictEqual({
      accept: true,
      scope: "openid workspace:write workspace:publish",
    });
  });

  it("leaves both out when both are unticked, and publishing alone", () => {
    expect(consentAnswer(advertising, nothing)).toStrictEqual({
      accept: true,
      scope: "openid workspace:write",
    });
    expect(consentAnswer(advertising, withoutPublish)).toStrictEqual({
      accept: true,
      scope: "openid workspace:write workspace:ads",
    });
  });

  it("narrows nothing when ads are all there is to allow", () => {
    expect(consentAnswer(["openid", "workspace:ads"], nothing)).toStrictEqual({
      accept: true,
    });
  });
});
