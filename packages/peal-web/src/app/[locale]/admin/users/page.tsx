import { DateTime } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Badge } from "peal-ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";

import { Instant } from "#components/staff/instant.tsx";
import { Pager } from "#components/staff/pager.tsx";
import { SearchForm } from "#components/staff/search-form.tsx";
import { Link } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { pageOf, queryOf } from "#staff/paging.ts";
import { staffRead } from "#staff/server.ts";

const pathname = "/admin/users";

// Accounts, newest first, or those whose email or name holds the search.
const UsersPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/users">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const search = await searchParams;
  const query = queryOf(search["query"]);
  const page = pageOf(search["page"]);

  const users = await staffRead((staff) =>
    staff.users({
      query: query === undefined ? { page } : { page, query },
    })
  );

  const t = await getTranslations("Staff.users");
  const staffT = await getTranslations("Staff");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <SearchForm label={t("searchLabel")} pathname={pathname} query={query} />
      {users.items.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.email")}</TableHead>
              <TableHead>{t("columns.created")}</TableHead>
              <TableHead>{t("columns.lastSignIn")}</TableHead>
              <TableHead>{t("columns.state")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.items.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Link href={`${pathname}/${user.id}`} className="font-medium">
                    {user.name}
                  </Link>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Instant value={DateTime.formatIso(user.createdAt)} />
                </TableCell>
                <TableCell>
                  {user.lastSignInAt === null ? (
                    staffT("never")
                  ) : (
                    <Instant value={DateTime.formatIso(user.lastSignInAt)} />
                  )}
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1">
                    {user.staff ? (
                      <Badge variant="secondary">{t("staff")}</Badge>
                    ) : null}
                    {user.banned ? (
                      <Badge variant="destructive">{t("banned")}</Badge>
                    ) : null}
                    {user.emailVerified ? null : (
                      <Badge variant="outline">{t("unverified")}</Badge>
                    )}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pager
        page={users.page}
        pageSize={users.pageSize}
        pathname={pathname}
        query={query}
        total={users.total}
      />
    </div>
  );
};

export default UsersPage;
