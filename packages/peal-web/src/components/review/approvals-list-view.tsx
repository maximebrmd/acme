"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type { ApprovalRequest } from "peal-contract";
import type { ReactNode } from "react";

/**
 * One approval that waits: the link that opens its post (`children`), when
 * the post was asked to go out, and who asked.
 */
export const ApprovalItemView = ({
  approval,
  children,
}: {
  readonly approval: ApprovalRequest;
  readonly children: ReactNode;
}) => {
  const t = useTranslations("Review");
  const format = useFormatter();

  const instant = (at: DateTime.Utc) =>
    format.dateTime(DateTime.toDate(at), {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <li className="flex flex-col gap-1 rounded-lg border p-4">
      {children}
      <p className="text-sm">
        {t("approval.askedFor", { at: instant(approval.schedule.at) })}
      </p>
      <p className="text-muted-foreground text-xs">
        {t("approval.askedBy", {
          at: instant(approval.requestedAt),
          name: approval.requestedByName ?? "",
          via:
            approval.requestedByName === null &&
            approval.requestedVia === "member"
              ? "unknown"
              : approval.requestedVia,
        })}
      </p>
    </li>
  );
};
