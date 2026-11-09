"use client";

import { Button } from "acme-ui/components/button";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";

// What a page that failed shows: that it was reported, a way to try again,
// and the home page, a link the page gives in the reader's language.
export const ErrorView = ({
  home,
  onRetry,
}: {
  readonly home: ReactElement;
  readonly onRetry: () => void;
}) => {
  const t = useTranslations("ErrorPage");

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onRetry}>{t("retry")}</Button>
        <Button variant="outline" render={home} nativeButton={false}>
          {t("home")}
        </Button>
      </div>
    </div>
  );
};
