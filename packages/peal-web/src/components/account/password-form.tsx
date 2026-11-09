"use client";

import { useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { authClient } from "#auth/client.ts";
import { FormField } from "#components/auth/form-field.tsx";
import { SettingsError } from "#components/settings/settings-error.tsx";
import { settingsErrorKey } from "#settings/errors.ts";
import type { SettingsErrorKey } from "#settings/errors.ts";

// A new password, once the current one confirms who is asking. Other
// sessions are signed out unless the user keeps them.
export const PasswordForm = () => {
  const t = useTranslations("AccountSettings.password");
  const fields = useTranslations("Auth");
  const settings = useTranslations("Settings");
  const signOutId = useId();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [signOutOthers, setSignOutOthers] = useState(true);

  const [error, setError] = useState<SettingsErrorKey | "mismatch" | null>(
    null
  );

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (next !== again) {
      setError("mismatch");

      return;
    }

    startTransition(async () => {
      const result = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: signOutOthers,
      });

      if (result.error === null) {
        setError(null);
        setCurrent("");
        setNext("");
        setAgain("");
        toast.success(t("changed"));
      } else {
        setError(settingsErrorKey(result.error));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      {error === "mismatch" ? (
        <p role="alert" className="text-destructive text-sm">
          {t("mismatch")}
        </p>
      ) : (
        <SettingsError error={error} />
      )}
      <FormField
        id="current-password"
        type="password"
        autoComplete="current-password"
        label={t("current")}
        value={current}
        onChange={setCurrent}
      />
      <FormField
        id="new-password"
        type="password"
        autoComplete="new-password"
        label={fields("newPassword")}
        hint={fields("passwordHint")}
        minLength={12}
        value={next}
        onChange={setNext}
      />
      <FormField
        id="new-password-again"
        type="password"
        autoComplete="new-password"
        label={fields("confirmPassword")}
        minLength={12}
        value={again}
        onChange={setAgain}
      />
      <div className="flex items-center gap-3">
        <Checkbox
          id={signOutId}
          checked={signOutOthers}
          disabled={isPending}
          onCheckedChange={setSignOutOthers}
        />
        <Label htmlFor={signOutId}>{t("signOutOthers")}</Label>
      </div>
      <div>
        <Button type="submit" disabled={isPending} focusableWhenDisabled>
          {isPending ? settings("saving") : t("change")}
        </Button>
      </div>
    </form>
  );
};
