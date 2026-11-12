import { describe, expect, it } from "@effect/vitest";

import { offersSignUp, signUpFormShown } from "#auth/sign-up-mode.ts";

describe(signUpFormShown, () => {
  it("shows the form to anyone on an open server", () => {
    expect(signUpFormShown("open", undefined)).toBeTruthy();
  });

  it("shows it on a server by invitation to whoever comes from one", () => {
    expect(
      signUpFormShown("invitation", "0190f3a0-0000-7000-8000-00000000e001")
    ).toBeTruthy();
  });

  it("shows only the notice to anyone else there", () => {
    expect(signUpFormShown("invitation", undefined)).toBeFalsy();
    expect(signUpFormShown("invitation", "")).toBeFalsy();
    expect(signUpFormShown("invitation", ["a", "b"])).toBeFalsy();
  });
});

describe(offersSignUp, () => {
  it("links to the sign-up page only on an open server", () => {
    expect(offersSignUp("open")).toBeTruthy();
    expect(offersSignUp("invitation")).toBeFalsy();
  });
});
