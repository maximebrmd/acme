import { describe, expect, it } from "@effect/vitest";

import type { AuthErrorKey } from "#auth/errors.ts";
import {
  recoveryCodeOf,
  TwoStepChallengeView,
} from "#components/auth/two-step-challenge-view.tsx";
import type { ChallengeMode } from "#components/auth/two-step-challenge-view.tsx";

import { ignore, render } from "./render.tsx";

const challenge = async (
  mode: ChallengeMode,
  error: AuthErrorKey | null,
  locale: "en" | "fr" = "en"
) =>
  await render(
    locale,
    <TwoStepChallengeView
      code=""
      error={error}
      mode={mode}
      pending={false}
      trust={false}
      onCode={ignore}
      onMode={ignore}
      onStartAgain={ignore}
      onSubmit={ignore}
      onTrust={ignore}
    />
  );

describe(TwoStepChallengeView, () => {
  it("asks for the app's six digits, as phones fill them in", async () => {
    const html = await challenge("app", null);

    expect(html).toContain(
      "Enter the 6-digit code from your authenticator app"
    );
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('autoComplete="one-time-code"');
    expect(html).toContain('maxLength="6"');
  });

  it("offers to trust the browser, or a recovery code instead", async () => {
    const html = await challenge("app", null);

    expect(html).toContain("Trust this browser for 30 days");
    expect(html).toContain("Use a recovery code");
  });

  it("swaps the field for a recovery code", async () => {
    const html = await challenge("recovery", null);

    expect(html).toContain("Recovery code");
    expect(html).toContain("Use the authenticator app");
    expect(html).not.toContain("one-time-code");
  });

  it("says a code was wrong, and lets the person try again", async () => {
    const html = await challenge("app", "INVALID_CODE");

    expect(html).toContain("This code is not the one");
    expect(html).toContain("Verify");
  });

  it.each([
    ["TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE", "Too many wrong codes"],
    ["ACCOUNT_TEMPORARILY_LOCKED", "locked for 15 minutes"],
    ["INVALID_TWO_FACTOR_COOKIE", "This sign-in has expired"],
  ] as const)(
    "after %s, offers only to sign in again",
    async (refusal, words) => {
      const html = await challenge("app", refusal);

      expect(html).toContain(words);
      expect(html).toContain("Sign in again");
      expect(html).not.toContain("one-time-code");
    }
  );

  it("speaks French", async () => {
    await expect(challenge("app", null, "fr")).resolves.toContain(
      "Faire confiance à ce navigateur pendant 30 jours"
    );
  });
});

describe(recoveryCodeOf, () => {
  it("reads a code typed without its dash, or with spaces", () => {
    expect(recoveryCodeOf("AbCde12345")).toBe("AbCde-12345");
    expect(recoveryCodeOf("  AbCde-12345 ")).toBe("AbCde-12345");
  });
});
