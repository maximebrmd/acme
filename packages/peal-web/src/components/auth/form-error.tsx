"use client";

import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";

import type { AuthErrorKey } from "#auth/errors.ts";

// Why the last attempt failed, announced when it appears.
export const FormError = ({
  error,
}: {
  readonly error: AuthErrorKey | null;
}) => {
  const t = useTranslations("Auth.errors");

  return error === null ? null : (
    <Alert variant="destructive">
      <AlertDescription>{t(error)}</AlertDescription>
    </Alert>
  );
};
