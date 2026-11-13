import { getTranslations } from "next-intl/server";
import type { SharedPlatformAccount } from "peal-contract";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";

import { Link } from "#i18n/navigation.ts";

// The platform accounts under several free billing accounts, each account
// a link that opens it on the page.
export const SharedChannelsTable = async ({
  items,
  pathname,
}: {
  readonly items: readonly SharedPlatformAccount[];
  readonly pathname: string;
}) => {
  const t = await getTranslations("Staff.billingAccounts");

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("sharedEmpty")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("platform")}</TableHead>
          <TableHead>{t("platformAccount")}</TableHead>
          <TableHead>{t("accounts")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(({ accounts, platform, platformAccountId }) => (
          <TableRow key={`${platform} ${platformAccountId}`}>
            <TableCell>{platform}</TableCell>
            <TableCell>
              <code>{platformAccountId}</code>
            </TableCell>
            <TableCell>
              <ul className="flex flex-col gap-1">
                {accounts.map(({ accountId, workspaces }) => (
                  <li key={accountId}>
                    <Link
                      href={{ pathname, query: { query: accountId } }}
                      className="font-mono text-sm"
                    >
                      {accountId}
                    </Link>{" "}
                    <span className="text-muted-foreground text-sm">
                      {t("workspaces", { count: workspaces })}
                    </span>
                  </li>
                ))}
              </ul>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
