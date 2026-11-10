import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ContractFunctionPage, workspaceOf } from "#contract/page.tsx";
import { routing } from "#i18n/routing.ts";

export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/cancel">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Contract" });

  return { title: t("cancel.title") };
};

// Résilier votre contrat (Code de la consommation L215-1-1): cancelling a subscription, for anyone, signed in or not.
const CancelContractPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/cancel">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <ContractFunctionPage
      kind="cancellation"
      workspaceId={workspaceOf(await searchParams)}
    />
  );
};

export default CancelContractPage;
