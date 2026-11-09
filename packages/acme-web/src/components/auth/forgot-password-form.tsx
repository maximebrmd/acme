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
import { getPathname } from "#i18n/navigation.ts";

// Asks for a reset link. The answer is the same whether the email has an
// account or not, so the form cannot tell who uses Acme.
export const ForgotPasswordForm = () => {
  const t = useTranslations("ForgotPasswordPage");
  const fields = useTranslations("Auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: getPathname({ href: "/reset-password", locale }),
      });

      if (result.error === null) {
        setError(null);
        setSentTo(email);
      } else {
        setError(authErrorKey(result.error));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormError error={error} />
      {sentTo === null ? null : (
        <Alert>
          <AlertDescription>{t("sent", { email: sentTo })}</AlertDescription>
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
      <Button type="submit" disabled={isPending} focusableWhenDisabled>
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
};
