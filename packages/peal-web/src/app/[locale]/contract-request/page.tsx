import { Option, Schema } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ContractConfirmation } from "#components/contract/contract-confirmation.tsx";
import { routing } from "#i18n/routing.ts";

const decodeToken = Schema.decodeUnknownOption(Schema.NonEmptyString);

// Where the link emailed to a request's address leads: the request to
// cancel a contract or withdraw from one that this address sent without
// its contract number, to apply to one of the contracts it manages.
// Nobody signs in for it.
const ContractRequestPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/contract-request">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations("Contract.confirmation");
  const { token } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <ContractConfirmation token={decodeToken(token).pipe(Option.getOrNull)} />
    </div>
  );
};

export default ContractRequestPage;
