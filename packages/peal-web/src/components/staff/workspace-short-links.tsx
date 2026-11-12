import { getTranslations } from "next-intl/server";
import type { StaffShortLinkPage } from "peal-contract";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";

import { DisableWorkspaceShortLinks } from "#components/staff/disable-workspace-short-links.tsx";
import { Link } from "#i18n/navigation.ts";

/**
 * A workspace's short links, newest first, each linking to its page, and
 * the form that turns every one still on off at once.
 */
export const WorkspaceShortLinks = async ({
  page,
  workspaceId,
}: {
  readonly page: StaffShortLinkPage;
  readonly workspaceId: string;
}) => {
  const t = await getTranslations("Staff.shortLinks");

  if (page.total === 0) {
    return <p className="text-muted-foreground text-sm">{t("none")}</p>;
  }

  const on = page.items.filter(({ disabled }) => !disabled).length;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        {t("count", { shown: page.items.length, total: page.total })}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("code")}</TableHead>
            <TableHead>{t("destination")}</TableHead>
            <TableHead>{t("state")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {page.items.map((link) => (
            <TableRow key={link.code}>
              <TableCell>
                <Link href={`/admin/short-links?query=${link.code}`}>
                  {link.code}
                </Link>
              </TableCell>
              <TableCell className="max-w-md break-all whitespace-normal">
                {link.destination}
              </TableCell>
              <TableCell>{link.disabled ? t("turnedOff") : t("on")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {on === 0 && page.items.length === page.total ? null : (
        <DisableWorkspaceShortLinks workspaceId={workspaceId} />
      )}
    </div>
  );
};
