import { Effect, Option } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { buttonVariants } from "peal-ui/components/button";

import { BillingAccountDetails } from "#components/staff/billing-account-details.tsx";
import { CreditProblemsTable } from "#components/staff/credit-problems-table.tsx";
import { SearchForm } from "#components/staff/search-form.tsx";
import { SharedChannelsTable } from "#components/staff/shared-channels-table.tsx";
import { Link } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { queryOf } from "#staff/paging.ts";
import { accountsDeskRead } from "#staff/server.ts";

const pathname = "/admin/billing-accounts";

// One free tier per person: the platform accounts connected under several
// free billing accounts, page by page (`?after=`), and a billing account
// found by its id or a workspace's (`?query=`), with merging and requiring
// a payment method.
const BillingAccountsPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/billing-accounts">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const search = await searchParams;
  const query = queryOf(search["query"]);
  const after = queryOf(search["after"]);
  const t = await getTranslations("Staff.billingAccounts");

  const page = await accountsDeskRead((desk) =>
    desk.sharedChannels({ query: after === undefined ? {} : { after } })
  );

  const problems = await accountsDeskRead((desk) => desk.creditProblems());

  const found =
    query === undefined
      ? Option.none()
      : await accountsDeskRead((desk) =>
          desk.account({ query: { accountId: query } }).pipe(
            Effect.catchTag("BillingAccountNotFound", () =>
              desk.account({ query: { workspaceId: query } })
            ),
            Effect.map(Option.some),
            Effect.catchTag("BillingAccountNotFound", () =>
              Effect.succeed(Option.none())
            )
          )
        );

  let shown = null;

  if (query !== undefined) {
    shown = Option.isSome(found) ? (
      <BillingAccountDetails account={found.value} />
    ) : (
      <p className="text-muted-foreground">{t("none")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t("creditProblems.title")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("creditProblems.description")}
        </p>
        <CreditProblemsTable items={problems.items} />
      </section>
      <SearchForm label={t("lookup")} pathname={pathname} query={query} />
      {shown}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t("sharedTitle")}</h2>
        <SharedChannelsTable items={page.items} pathname={pathname} />
        {page.next === null ? null : (
          <div>
            <Link
              href={{ pathname, query: { after: page.next } }}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("more")}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};

export default BillingAccountsPage;
