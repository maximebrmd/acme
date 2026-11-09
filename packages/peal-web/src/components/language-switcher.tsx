"use client";

import { Button } from "peal-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "peal-ui/components/dropdown-menu";
import { Schema } from "effect";
import { LanguagesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";

const isLocale = Schema.is(Schema.Literals(routing.locales));

// Opens the current page in another language.
export const LanguageSwitcher = () => {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleValueChange = (value: string) => {
    if (!isLocale(value) || value === locale) {
      return;
    }

    startTransition(() => {
      router.replace(pathname, { locale: value });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            focusableWhenDisabled
          />
        }
        aria-label={t("trigger", { locale })}
      >
        <LanguagesIcon data-icon="inline-start" aria-hidden />
        {t("locale", { locale })}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={handleValueChange}
        >
          <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
          {routing.locales.map((option) => (
            <DropdownMenuRadioItem key={option} value={option} lang={option}>
              {t("locale", { locale: option })}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
