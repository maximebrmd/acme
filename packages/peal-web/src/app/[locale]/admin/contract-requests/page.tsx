import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ContractRequestCard } from "#components/staff/contract-request-card.tsx";
import { routing } from "#i18n/routing.ts";
import { deskRead } from "#staff/server.ts";

// The requests to cancel a contract or withdraw from one that wait for
// staff, oldest first.
const ContractRequestsPage = async ({
  params,
}: PageProps<"/[locale]/admin/contract-requests">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const requests = await deskRead((desk) => desk.list());
  const t = await getTranslations("Staff.requests");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      {requests.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {requests.map((request) => (
            <li key={request.id}>
              <ContractRequestCard request={request} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ContractRequestsPage;
