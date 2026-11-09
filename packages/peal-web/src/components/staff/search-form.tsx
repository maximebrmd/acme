import { getTranslations } from "next-intl/server";
import { Button } from "peal-ui/components/button";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";

import { Link } from "#i18n/navigation.ts";

// A console list's search: a plain form that loads the page again with
// `?query=`, so it works before the page hydrates.
export const SearchForm = async ({
  label,
  pathname,
  query,
}: {
  readonly label: string;
  readonly pathname: string;
  readonly query: string | undefined;
}) => {
  const t = await getTranslations("Staff.search");

  return (
    <search>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-64 flex-1 flex-col gap-2">
          <Label htmlFor="staff-search">{label}</Label>
          <Input
            id="staff-search"
            name="query"
            type="search"
            defaultValue={query}
            maxLength={200}
            autoComplete="off"
          />
        </div>
        <Button type="submit">{t("submit")}</Button>
        {query === undefined ? null : (
          <Button
            variant="ghost"
            render={<Link href={pathname} />}
            nativeButton={false}
          >
            {t("clear")}
          </Button>
        )}
      </form>
    </search>
  );
};
