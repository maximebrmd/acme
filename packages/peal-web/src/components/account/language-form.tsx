"use client";

import { Schema } from "effect";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "next-intl";
import { Button } from "peal-ui/components/button";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { authClient } from "#auth/client.ts";
import { SettingsError } from "#components/settings/settings-error.tsx";
import { usePathname, useRouter } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { settingsErrorKey } from "#settings/errors.ts";
import type { SettingsErrorKey } from "#settings/errors.ts";

const isLocale = Schema.is(Schema.Literals(routing.locales));

/**
 * The language Peal writes to the user in: their emails, and the app, which
 * opens in it as soon as it is saved, and whenever they sign in.
 */
export const LanguageForm = ({ saved }: { readonly saved: Locale }) => {
  const t = useTranslations("AccountSettings.language");
  const settings = useTranslations("Settings");
  const shown = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const labelId = useId();
  const [chosen, setChosen] = useState<Locale>(saved);
  const [error, setError] = useState<SettingsErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChosen = (value: string | null) => {
    if (value !== null && isLocale(value)) {
      setChosen(value);
    }
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await authClient.updateUser({ locale: chosen });

      if (result.error !== null) {
        setError(settingsErrorKey(result.error));

        return;
      }

      setError(null);

      // The page itself is the confirmation, in the language chosen.
      if (chosen === shown) {
        toast.success(t("saved"));
        router.refresh();
      } else {
        router.replace(pathname, { locale: chosen });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <SettingsError error={error} />
      <div className="flex flex-col gap-2">
        <Label id={labelId}>{t("label")}</Label>
        <Select
          value={chosen}
          disabled={isPending}
          onValueChange={handleChosen}
        >
          <SelectTrigger aria-labelledby={labelId}>
            <SelectValue>
              <span lang={chosen}>{t("option", { locale: chosen })}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {routing.locales.map((locale) => (
              <SelectItem key={locale} value={locale} lang={locale}>
                {t("option", { locale })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Button
          type="submit"
          disabled={isPending || (chosen === saved && chosen === shown)}
          focusableWhenDisabled
        >
          {isPending ? settings("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
};
