"use client";

import { Alert, AlertDescription } from "acme-ui/components/alert";
import { useTranslations } from "next-intl";

import type { DeletionLookup } from "#channels/data-deletion-status.ts";
import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import { useMounted } from "#posts/use-mounted.ts";
import { browserTimeZone } from "#posts/zoned-time.ts";

const Completed = ({
  lookup,
}: {
  readonly lookup: Extract<DeletionLookup, { _tag: "found" }>;
}) => {
  const t = useTranslations("DataDeletionPage");

  return (
    <p className="text-sm">
      {t("completed", {
        app: lookup.app,
        count: lookup.channelsDeleted,
        date: new Date(lookup.completedAt),
      })}
    </p>
  );
};

/**
 * A data deletion request's status, as the person Meta sent here reads
 * it: its code, and when Acme deleted the accounts it held, in the
 * reader's time zone once the page runs in their browser.
 */
export const DataDeletionStatusView = ({
  lookup,
}: {
  readonly lookup: DeletionLookup;
}) => {
  const t = useTranslations("DataDeletionPage");
  const mounted = useMounted();

  if (lookup._tag !== "found") {
    return (
      <Alert variant={lookup._tag === "notFound" ? "default" : "destructive"}>
        <AlertDescription>{t(lookup._tag)}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        {t("code", { code: lookup.confirmationCode })}
      </p>
      {mounted ? (
        <InTimeZone timeZone={browserTimeZone()}>
          <Completed lookup={lookup} />
        </InTimeZone>
      ) : (
        <p className="text-sm">{t("done", { app: lookup.app })}</p>
      )}
    </div>
  );
};
