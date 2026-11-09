"use client";

import { Alert, AlertDescription, AlertTitle } from "acme-ui/components/alert";
import { Button } from "acme-ui/components/button";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { SubmitEvent } from "react";

import { authClient } from "#auth/client.ts";
import { authErrorKey } from "#auth/errors.ts";
import type { AuthErrorKey } from "#auth/errors.ts";
import { FormError } from "#components/auth/form-error.tsx";
import { FormField } from "#components/auth/form-field.tsx";
import { useCaptcha } from "#components/auth/turnstile-field.tsx";
import { getPathname } from "#i18n/navigation.ts";

// Creates the account, in the page's language, which its emails will use.
// The confirmation link signs the new user in on the verify-email page.
// With a Turnstile site key, the server wants the widget's token too.
export const SignUpForm = ({
  captchaSiteKey,
}: {
  readonly captchaSiteKey: string | null;
}) => {
  const t = useTranslations("SignUpPage");
  const fields = useTranslations("Auth");
  const locale = useLocale();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const captcha = useCaptcha(captchaSiteKey);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await authClient.signUp.email({
        callbackURL: getPathname({ href: "/verify-email", locale }),
        email,
        fetchOptions: { headers: captcha.headers },
        locale,
        name,
        password,
      });

      // The token is spent, whatever the answer.
      captcha.reset();

      if (result.error === null) {
        setError(null);
        setSentTo(email);
      } else {
        setError(authErrorKey(result.error));
      }
    });
  };

  if (sentTo !== null) {
    return (
      <Alert>
        <AlertTitle>{t("checkInbox")}</AlertTitle>
        <AlertDescription>{t("sent", { email: sentTo })}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormError error={error} />
      <FormField
        id="name"
        type="text"
        autoComplete="name"
        label={fields("name")}
        value={name}
        onChange={setName}
      />
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
        autoComplete="new-password"
        label={fields("password")}
        hint={fields("passwordHint")}
        minLength={12}
        value={password}
        onChange={setPassword}
      />
      {captcha.widget}
      <Button
        type="submit"
        disabled={isPending || !captcha.ready}
        focusableWhenDisabled
      >
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
};
