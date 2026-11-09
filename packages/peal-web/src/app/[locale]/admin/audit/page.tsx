import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { AuditTable } from "#components/staff/audit-table.tsx";
import { Pager } from "#components/staff/pager.tsx";
import { routing } from "#i18n/routing.ts";
import { pageOf } from "#staff/paging.ts";
import { staffRead } from "#staff/server.ts";

// Everything staff did, newest first.
const AuditPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/audit">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const search = await searchParams;
  const page = pageOf(search["page"]);
  const audit = await staffRead((staff) => staff.audit({ query: { page } }));
  const t = await getTranslations("Staff.audit");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <AuditTable events={audit.items} />
      <Pager
        page={audit.page}
        pageSize={audit.pageSize}
        pathname="/admin/audit"
        total={audit.total}
      />
    </div>
  );
};

export default AuditPage;
