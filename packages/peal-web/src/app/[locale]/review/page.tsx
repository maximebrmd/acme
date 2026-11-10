import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ReviewLinkScreen } from "#components/review/review-link-screen.tsx";
import { routing } from "#i18n/routing.ts";

// A review link's page is for whoever holds the link: search engines keep
// out of it, and it tells no other site where its reader came from.
export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/review">): Promise<Metadata> => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Review" });

  return {
    referrer: "no-referrer",
    robots: { follow: false, index: false },
    title: t("page.metaTitle"),
  };
};

// Where a review link leads: /review#<token>. The page itself holds
// nothing of the post: the browser reads the token from the address, which
// never reaches this server, and asks the API for what the link shows. No
// sign-in, and nothing is loaded from anyone but Peal and its media store
// while the post is read.
const ReviewPage = async ({ params }: PageProps<"/[locale]/review">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations("Review");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("page.title")}
        </h1>
        <p className="text-muted-foreground">{t("page.intro")}</p>
      </div>
      <ReviewLinkScreen />
    </div>
  );
};

export default ReviewPage;
