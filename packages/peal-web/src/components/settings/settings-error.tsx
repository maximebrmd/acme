"use client";

import { Alert, AlertDescription } from "acme-ui/components/alert";
import { useTranslations } from "next-intl";

import type { SettingsErrorKey } from "#settings/errors.ts";

// Why the last settings action failed, announced when it appears.
export const SettingsError = ({
  error,
}: {
  readonly error: SettingsErrorKey | null;
}) => {
  const t = useTranslations("Settings.errors");

  return error === null ? null : (
    <Alert variant="destructive">
      <AlertDescription>{t(error)}</AlertDescription>
    </Alert>
  );
};
