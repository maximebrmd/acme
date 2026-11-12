"use client";

import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { useId } from "react";
import type { ChangeEvent, SubmitEvent } from "react";

import type { AuthErrorKey } from "#auth/errors.ts";

/** How the person proves the second step: their app's code, or a recovery code. */
export type ChallengeMode = "app" | "recovery";

// The refusals after which this sign-in is over: a new one starts from the
// password.
const spent: ReadonlySet<AuthErrorKey> = new Set([
  "ACCOUNT_TEMPORARILY_LOCKED",
  "INVALID_TWO_FACTOR_COOKIE",
  "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE",
]);

/** Whether a refusal ends the sign-in, so the password is asked again. */
export const endsSignIn = (error: AuthErrorKey | null): boolean =>
  error !== null && spent.has(error);

/**
 * A recovery code as the library issues it, `abcde-12345`, however it was
 * typed: with spaces around it, or without its dash.
 */
export const recoveryCodeOf = (typed: string): string => {
  const code = typed.trim();

  return code.length === 10 && !code.includes("-")
    ? `${code.slice(0, 5)}-${code.slice(5)}`
    : code;
};

interface TwoStepChallengeViewProps {
  readonly code: string;
  readonly error: AuthErrorKey | null;
  readonly mode: ChallengeMode;
  readonly onCode: (code: string) => void;
  readonly onMode: (mode: ChallengeMode) => void;
  readonly onStartAgain: () => void;
  readonly onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  readonly onTrust: (trust: boolean) => void;
  readonly pending: boolean;
  readonly trust: boolean;
}

/**
 * The second step of a sign-in, in the sign-in's card: a code from the
 * authenticator app, or a recovery code, with the box that trusts this
 * browser for 30 days. Once the sign-in is spent (too many codes, the
 * account locked, the step expired), only signing in again is offered.
 */
export const TwoStepChallengeView = ({
  code,
  error,
  mode,
  onCode,
  onMode,
  onStartAgain,
  onSubmit,
  onTrust,
  pending,
  trust,
}: TwoStepChallengeViewProps) => {
  const t = useTranslations("TwoStep");
  const errors = useTranslations("Auth.errors");
  const codeId = useId();
  const hintId = useId();
  const trustId = useId();

  const handleCode = (event: ChangeEvent<HTMLInputElement>) => {
    onCode(event.target.value);
  };

  const handleTrust = (checked: boolean) => {
    onTrust(checked);
  };

  const handleSwitch = () => {
    onMode(mode === "app" ? "recovery" : "app");
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("challengeTitle")}</h2>
        <p className="text-muted-foreground text-sm">{t("challengeAbout")}</p>
      </div>
      {error === null ? null : (
        <Alert variant="destructive">
          <AlertDescription>{errors(error)}</AlertDescription>
        </Alert>
      )}
      {endsSignIn(error) ? (
        <Button type="button" onClick={onStartAgain}>
          {t("startAgain")}
        </Button>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor={codeId}>
              {mode === "app" ? t("enterCode") : t("recoveryCode")}
            </Label>
            {mode === "app" ? (
              <Input
                id={codeId}
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={handleCode}
                required
              />
            ) : (
              <Input
                id={codeId}
                name="recovery-code"
                autoComplete="off"
                spellCheck={false}
                pattern="\s*[A-Za-z0-9]{5}-?[A-Za-z0-9]{5}\s*"
                maxLength={13}
                value={code}
                onChange={handleCode}
                aria-describedby={hintId}
                required
              />
            )}
            {mode === "recovery" ? (
              <p id={hintId} className="text-muted-foreground text-xs">
                {t("recoveryCodeHint")}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={trustId}
              checked={trust}
              onCheckedChange={handleTrust}
            />
            <Label htmlFor={trustId}>{t("trust")}</Label>
          </div>
          <Button type="submit" disabled={pending} focusableWhenDisabled>
            {pending ? t("verifying") : t("verify")}
          </Button>
          <Button type="button" variant="link" onClick={handleSwitch}>
            {mode === "app" ? t("useRecovery") : t("useApp")}
          </Button>
        </>
      )}
    </form>
  );
};
