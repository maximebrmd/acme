import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "acme-ui/components/table";
import { DateTime } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Instant } from "#components/staff/instant.tsx";
import { Pager } from "#components/staff/pager.tsx";
import { SearchForm } from "#components/staff/search-form.tsx";
import { Link } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { pageOf, queryOf } from "#staff/paging.ts";
import { staffRead } from "#staff/server.ts";

const pathname = "/admin/workspaces";

// Workspaces, newest first, or those whose name or slug holds the search.
const WorkspacesPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/workspaces">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const search = await searchParams;
  const query = queryOf(search["query"]);
  const page = pageOf(search["page"]);

  const workspaces = await staffRead((staff) =>
    staff.workspaces({
      query: query === undefined ? { page } : { page, query },
    })
  );

  const t = await getTranslations("Staff.workspaces");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <SearchForm label={t("searchLabel")} pathname={pathname} query={query} />
      {workspaces.items.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.slug")}</TableHead>
              <TableHead>{t("columns.members")}</TableHead>
              <TableHead>{t("columns.created")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaces.items.map((workspace) => (
              <TableRow key={workspace.id}>
                <TableCell>
                  <Link
                    href={`${pathname}/${workspace.id}`}
                    className="font-medium"
                  >
                    {workspace.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <code>{workspace.slug}</code>
                </TableCell>
                <TableCell>{workspace.members}</TableCell>
                <TableCell>
                  <Instant value={DateTime.formatIso(workspace.createdAt)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pager
        page={workspaces.page}
        pageSize={workspaces.pageSize}
        pathname={pathname}
        query={query}
        total={workspaces.total}
      />
    </div>
  );
};

export default WorkspacesPage;
