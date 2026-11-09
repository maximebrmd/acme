"use client";

import { Alert, AlertDescription } from "acme-ui/components/alert";
import { useTranslations } from "next-intl";

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
