"use client";

import { Button } from "peal-ui/components/button";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { authClient } from "#auth/client.ts";
import { FormField } from "#components/auth/form-field.tsx";
import { SettingsError } from "#components/settings/settings-error.tsx";
import { useRouter } from "#i18n/navigation.ts";
import { settingsErrorKey } from "#settings/errors.ts";
import type { SettingsErrorKey } from "#settings/errors.ts";

// The name other members see, and that invitations sign with.
export const ProfileForm = ({ name }: { readonly name: string }) => {
  const t = useTranslations("AccountSettings.profile");
  const settings = useTranslations("Settings");
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<SettingsErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const chosen = value.trim();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await authClient.updateUser({ name: chosen });

      if (result.error === null) {
        setError(null);
        toast.success(t("saved"));
        router.refresh();
      } else {
        setError(settingsErrorKey(result.error));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <SettingsError error={error} />
      <FormField
        id="account-name"
        type="text"
        autoComplete="name"
        label={t("name")}
        value={value}
        onChange={setValue}
      />
      <div>
        <Button
          type="submit"
          disabled={isPending || chosen === "" || chosen === name}
          focusableWhenDisabled
        >
          {isPending ? settings("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
};
