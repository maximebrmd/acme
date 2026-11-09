"use client";

import { Alert, AlertDescription } from "acme-ui/components/alert";
import { Button } from "acme-ui/components/button";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { SubmitEvent } from "react";

import { authClient } from "#auth/client.ts";
import { authErrorKey } from "#auth/errors.ts";
import type { AuthErrorKey } from "#auth/errors.ts";
import { FormError } from "#components/auth/form-error.tsx";
import { FormField } from "#components/auth/form-field.tsx";
import { getPathname, useRouter } from "#i18n/navigation.ts";

export const SignInForm = () => {
  const t = useTranslations("SignInPage");
  const fields = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [resentTo, setResentTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await authClient.signIn.email({ email, password });

      if (result.error === null) {
        router.push("/app");
        router.refresh();
      } else {
        setResentTo(null);
        setError(authErrorKey(result.error));
      }
    });
  };

  // Someone who lost the confirmation email asks for another.
  const handleResend = () => {
    startTransition(async () => {
      const result = await authClient.sendVerificationEmail({
        callbackURL: getPathname({ href: "/verify-email", locale }),
        email,
      });

      if (result.error === null) {
        setError(null);
        setResentTo(email);
      } else {
        setError(authErrorKey(result.error));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormError error={error} />
      {resentTo === null ? null : (
        <Alert>
          <AlertDescription>
            {t("resent", { email: resentTo })}
          </AlertDescription>
        </Alert>
      )}
      <FormField
        id="email"
        type="email"
        autoComplete="email"
        label={fields("email")}
        value={email}
        onChange={setEmail}
      />
      <FormField
        id="password"
        type="password"
        autoComplete="current-password"
        label={fields("password")}
        value={password}
        onChange={setPassword}
      />
      <Button type="submit" disabled={isPending} focusableWhenDisabled>
        {isPending ? t("submitting") : t("submit")}
      </Button>
      {error === "EMAIL_NOT_VERIFIED" ? (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          focusableWhenDisabled
          onClick={handleResend}
        >
          {t("resend")}
        </Button>
      ) : null}
    </form>
  );
};
