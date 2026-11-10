import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { HostedConnect } from "#components/connect-link/hosted-connect.tsx";
import { routing } from "#i18n/routing.ts";

// A connect link's hosted page: whoever holds the link connects a social
// account to the workspace that made it, without a Peal account. The token
// in its address is the only credential, so the page is kept out of search
// engines, and its address out of the Referer of what it links to (see
// next.config.ts).
export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/connect/link/[token]">): Promise<Metadata> => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "ConnectLink" });

  return {
    referrer: "no-referrer",
    robots: { follow: false, index: false },
    title: t("title"),
  };
};

const ConnectLinkPage = async ({
  params,
}: PageProps<"/[locale]/connect/link/[token]">) => {
  const { locale, token } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return <HostedConnect token={token} />;
};

export default ConnectLinkPage;
