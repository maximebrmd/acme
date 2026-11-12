import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Button } from "peal-ui/components/button";

import { StaffNav } from "#components/staff/staff-nav.tsx";
import { Link } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { answersLegalRequests, consoleVisitor } from "#staff/server.ts";

export const generateMetadata = async ({
  params,
}: LayoutProps<"/[locale]/admin">): Promise<Metadata> => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Staff" });

  return { robots: { follow: false, index: false }, title: t("title") };
};

// The staff console, for staff in their own session only: anyone else,
// signed in or not, gets the not-found page, as the API answers them 404;
// staff without two-step verification, where the server requires it of
// them, the way to turn it on.
// Cloudflare Access guards /admin too on Peal's own servers.
const StaffLayout = async ({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const visitor = await consoleVisitor();
  const t = await getTranslations("Staff");

  // On a server that requires it of staff, nothing of the console shows
  // before their own account has two-step verification on.
  if (visitor._tag === "twoStepRequired") {
    const twoStep = await getTranslations("TwoStep");

    return (
      <div className="flex max-w-xl flex-col gap-4">
        <p className="font-semibold tracking-tight">{t("title")}</p>
        <p>{twoStep("staffConsoleRequires")}</p>
        <div>
          <Button render={<Link href="/app/account" />} nativeButton={false}>
            {twoStep("goToAccount")}
          </Button>
        </div>
      </div>
    );
  }

  const legal = await answersLegalRequests();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold tracking-tight">{t("title")}</p>
        <p className="text-muted-foreground text-sm">
          {t("signedInAs", { email: visitor.email })}
        </p>
      </div>
      <StaffNav legal={legal} />
      {children}
    </div>
  );
};

export default StaffLayout;
