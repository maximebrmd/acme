"use client";

import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";

// What a settings list shows while it loads, and when it could not.

export const SettingsLoading = () => {
  const t = useTranslations("Settings");

  return (
    <div aria-busy className="flex flex-col gap-3">
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-16" />
    </div>
  );
};

export const SettingsLoadFailed = ({
  onRetry,
}: {
  readonly onRetry: () => void;
}) => {
  const t = useTranslations("Settings");

  return (
    <Alert variant="destructive">
      <AlertDescription>
        <span className="flex flex-wrap items-center justify-between gap-2">
          {t("loadFailed")}
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t("retry")}
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
};
