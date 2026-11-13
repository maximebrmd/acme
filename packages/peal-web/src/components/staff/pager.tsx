import { getTranslations } from "next-intl/server";
import { Button } from "peal-ui/components/button";

import { Link } from "#i18n/navigation.ts";
import { pageCount, pagedHref } from "#staff/paging.ts";

// How many rows a list holds, and links to the pages around this one.
export const Pager = async ({
  page,
  pageSize,
  pathname,
  query,
  total,
}: {
  readonly page: number;
  readonly pageSize: number;
  readonly pathname: string;
  readonly query?: string | undefined;
  readonly total: number;
}) => {
  const t = await getTranslations("Staff.pager");
  const pages = pageCount(total, pageSize);

  return (
    <nav
      aria-label={t("label")}
      className="flex flex-wrap items-center justify-between gap-4 text-sm"
    >
      <p className="text-muted-foreground">
        {t("total", { total })} · {t("position", { page, pages })}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={pagedHref(pathname, { page: page - 1, query })} />
            }
          >
            {t("previous")}
          </Button>
        ) : null}
        {page < pages ? (
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={pagedHref(pathname, { page: page + 1, query })} />
            }
          >
            {t("next")}
          </Button>
        ) : null}
      </div>
    </nav>
  );
};
