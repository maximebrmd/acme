"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type { ApprovalRequest } from "peal-contract";
import { Badge } from "peal-ui/components/badge";

import { reviewerName } from "./comment-threads-view.tsx";

/**
 * The approvals asked for a post, newest first: when each was asked to go
 * out, who asked, and who decided what, and when.
 */
export const ApprovalHistoryView = ({
  approvals,
}: {
  readonly approvals: readonly ApprovalRequest[];
}) => {
  const t = useTranslations("Review");
  const format = useFormatter();

  const instant = (at: DateTime.Utc) =>
    format.dateTime(DateTime.toDate(at), {
      dateStyle: "medium",
      timeStyle: "short",
    });

  if (approvals.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-2">
      {approvals.map((approval) => (
        <li
          key={approval.id}
          className="flex flex-col gap-1 rounded-lg border p-3 text-sm"
        >
          <span className="flex flex-wrap items-center gap-2">
            <Badge
              variant={approval.status === "pending" ? "default" : "outline"}
            >
              {t("approval.status", { status: approval.status })}
            </Badge>
            <span>
              {t("approval.askedFor", { at: instant(approval.schedule.at) })}
            </span>
          </span>
          <span className="text-muted-foreground text-xs">
            {t("approval.askedBy", {
              at: instant(approval.requestedAt),
              name: approval.requestedByName ?? "",
              via:
                approval.requestedByName === null &&
                approval.requestedVia === "member"
                  ? "unknown"
                  : approval.requestedVia,
            })}
          </span>
          {approval.decision === null ? null : (
            <span className="text-muted-foreground text-xs">
              {t("approval.decidedBy", {
                at: instant(approval.decision.at),
                kind: approval.decision.by.kind,
                name: reviewerName(t, approval.decision.by),
              })}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};
