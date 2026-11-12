import { Effect, Option } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { SearchForm } from "#components/staff/search-form.tsx";
import { ShortLinkDetails } from "#components/staff/short-link-details.tsx";
import { routing } from "#i18n/routing.ts";
import { queryOf } from "#staff/paging.ts";
import { staffRead } from "#staff/server.ts";
import { shortLinkCodeOf } from "#staff/short-link-code.ts";

const pathname = "/admin/short-links";

// A short link found by its code, or its whole address: where it leads,
// whose post holds it, and turning it off or on again.
const ShortLinksPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/short-links">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const search = await searchParams;
  const query = queryOf(search["query"]);
  const code = query === undefined ? "" : shortLinkCodeOf(query);
  const t = await getTranslations("Staff.shortLinks");

  // Staff only: anyone else gets the not-found page, whatever they ask.
  const found =
    code === ""
      ? await staffRead((staff) =>
          staff.session().pipe(Effect.as(Option.none()))
        )
      : await staffRead((staff) =>
          staff.shortLink({ params: { code } }).pipe(
            Effect.map(Option.some),
            Effect.catchTag("ShortLinkNotFound", () =>
              Effect.succeed(Option.none())
            )
          )
        );

  let shown = null;

  if (code !== "") {
    shown = Option.isSome(found) ? (
      <ShortLinkDetails link={found.value} />
    ) : (
      <p className="text-muted-foreground">{t("notFound")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <SearchForm label={t("searchLabel")} pathname={pathname} query={query} />
      {shown}
    </div>
  );
};

export default ShortLinksPage;
