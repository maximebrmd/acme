import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { legalDisclosureYears } from "peal-contract";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";

import { DisclosureTable } from "#components/staff/disclosure-table.tsx";
import { LegalRequestForm } from "#components/staff/legal-request-form.tsx";
import { Pager } from "#components/staff/pager.tsx";
import { Section } from "#components/staff/section.tsx";
import { routing } from "#i18n/routing.ts";
import { pageOf } from "#staff/paging.ts";
import { legalRead } from "#staff/server.ts";

// Legal requests, for staff who hold the legal role: the API answers
// anyone else 404, other staff included, and so does this page. It says,
// before anything is entered, that each answer is recorded under the staff
// member's name, as staff must be told of what records their work.
const LegalPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/legal">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const search = await searchParams;
  const page = pageOf(search["page"]);
  const past = await legalRead((legal) => legal.answered({ query: { page } }));
  const t = await getTranslations("Staff.legal");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <Alert>
        <AlertTitle>{t("recordedTitle")}</AlertTitle>
        <AlertDescription>
          {t("recorded", { years: legalDisclosureYears })}
        </AlertDescription>
      </Alert>
      <Section title={t("form.title")}>
        <LegalRequestForm />
      </Section>
      <Section title={t("past.title")} description={t("past.description")}>
        <div className="flex flex-col gap-6">
          <DisclosureTable disclosures={past.items} />
          <Pager
            page={past.page}
            pageSize={past.pageSize}
            pathname="/admin/legal"
            total={past.total}
          />
        </div>
      </Section>
    </div>
  );
};

export default LegalPage;
