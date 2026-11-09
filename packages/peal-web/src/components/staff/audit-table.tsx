import type { StaffAuditEvent } from "peal-contract";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";
import { DateTime } from "effect";
import { getTranslations } from "next-intl/server";

import { Instant } from "#components/staff/instant.tsx";
import { Link } from "#i18n/navigation.ts";

// Who an audit event names: a link to the account while it exists.
const Account = async ({
  email,
  id,
}: {
  readonly email: string | null;
  readonly id: string | null;
}) => {
  const t = await getTranslations("Staff.audit");

  if (id === null) {
    return <span className="text-muted-foreground">{t("closedAccount")}</span>;
  }

  return <Link href={`/admin/users/${id}`}>{email ?? id}</Link>;
};

// What staff did, newest first.
export const AuditTable = async ({
  events,
}: {
  readonly events: readonly StaffAuditEvent[];
}) => {
  const t = await getTranslations("Staff.audit");

  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.at")}</TableHead>
          <TableHead>{t("columns.staff")}</TableHead>
          <TableHead>{t("columns.action")}</TableHead>
          <TableHead>{t("columns.target")}</TableHead>
          <TableHead>{t("columns.reason")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell>
              <Instant value={DateTime.formatIso(event.at)} />
            </TableCell>
            <TableCell>
              <Account email={event.staffEmail} id={event.staffId} />
            </TableCell>
            <TableCell>
              {t("action", { action: event.action })}
              {event.banExpiresAt === null ? null : (
                <span className="text-muted-foreground block text-sm">
                  {t("until")}{" "}
                  <Instant value={DateTime.formatIso(event.banExpiresAt)} />
                </span>
              )}
            </TableCell>
            <TableCell>
              <Account email={event.targetEmail} id={event.targetId} />
            </TableCell>
            <TableCell className="whitespace-normal">
              {event.reason ?? (
                <span className="text-muted-foreground">{t("noReason")}</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
