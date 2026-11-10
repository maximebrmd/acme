import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ContractFunctionPage, workspaceOf } from "#contract/page.tsx";
import { routing } from "#i18n/routing.ts";

export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/withdraw">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Contract" });

  return { title: t("withdraw.title") };
};

// Renoncer au contrat ici (Code de la consommation L221-21): a consumer's withdrawal within 14 days, for anyone, signed in or not.
const WithdrawPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/withdraw">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <ContractFunctionPage
      kind="withdrawal"
      workspaceId={workspaceOf(await searchParams)}
    />
  );
};

export default WithdrawPage;
