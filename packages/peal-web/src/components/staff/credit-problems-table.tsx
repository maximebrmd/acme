import { DateTime } from "effect";
import { getTranslations } from "next-intl/server";
import type { StaffCreditProblem } from "peal-contract";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";

import { Instant } from "#components/staff/instant.tsx";
import { SettleCreditProblem } from "#components/staff/settle-credit-problem.tsx";
import { Link } from "#i18n/navigation.ts";

// Money Peal owes back that Stripe did not give: a credit it refused for
// good, or a refund it reported failed, each for staff to settle by hand.
export const CreditProblemsTable = async ({
  items,
}: {
  readonly items: readonly StaffCreditProblem[];
}) => {
  const t = await getTranslations("Staff.billingAccounts.creditProblems");

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("at")}</TableHead>
          <TableHead>{t("kind")}</TableHead>
          <TableHead>{t("amount")}</TableHead>
          <TableHead>{t("stripe")}</TableHead>
          <TableHead>{t("workspace")}</TableHead>
          <TableHead>{t("settled")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((problem) => (
          <TableRow
            key={`${problem.kind} ${problem.refundId ?? problem.stripeSubscriptionId ?? ""} ${problem.reason ?? ""}`}
          >
            <TableCell>
              <Instant value={DateTime.formatIso(problem.occurredAt)} />
            </TableCell>
            <TableCell>
              {t("kindName", { kind: problem.kind })}
              {problem.code === null ? null : (
                <>
                  {" "}
                  <code>{problem.code}</code>
                </>
              )}
            </TableCell>
            <TableCell variant="numeric">
              {(problem.amount / 100).toFixed(2)}{" "}
              {problem.currency.toUpperCase()}
            </TableCell>
            <TableCell>
              <code>{problem.refundId ?? problem.stripeSubscriptionId}</code>
            </TableCell>
            <TableCell>
              {problem.workspaceId === null ? (
                t("noWorkspace")
              ) : (
                <Link href={`/admin/workspaces/${problem.workspaceId}`}>
                  <code>{problem.workspaceId}</code>
                </Link>
              )}
            </TableCell>
            <TableCell>
              {problem.settledAt === null ? (
                <SettleCreditProblem problemKey={problem.key} />
              ) : (
                <Instant value={DateTime.formatIso(problem.settledAt)} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
