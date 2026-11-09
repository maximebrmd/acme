import { Effect } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { lookUpDeletion } from "#channels/data-deletion-status.ts";
import { AuthCard } from "#components/auth/auth-card.tsx";
import { DataDeletionStatusView } from "#components/channels/data-deletion-status.tsx";
import { routing } from "#i18n/routing.ts";

// Where Meta sends people who asked, through Facebook or Threads, for the
// data Peal holds about them to be deleted: the status of their request, by
// the confirmation code Meta showed them. Nobody signs in for it.
const DataDeletionPage = async ({
  params,
}: PageProps<"/[locale]/data-deletion/[code]">) => {
  const { code, locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  await connection();

  const t = await getTranslations("DataDeletionPage");
  const lookup = await Effect.runPromise(lookUpDeletion(code));

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <DataDeletionStatusView lookup={lookup} />
    </AuthCard>
  );
};

export default DataDeletionPage;
