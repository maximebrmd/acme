import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { StaffNav } from "#components/staff/staff-nav.tsx";
import { routing } from "#i18n/routing.ts";
import { staffRead } from "#staff/server.ts";

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
// signed in or not, gets the not-found page, as the API answers them 404.
// Cloudflare Access guards /admin too on Peal's own servers.
const StaffLayout = async ({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const staff = await staffRead((client) => client.session());
  const t = await getTranslations("Staff");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold tracking-tight">{t("title")}</p>
        <p className="text-muted-foreground text-sm">
          {t("signedInAs", { email: staff.email })}
        </p>
      </div>
      <StaffNav />
      {children}
    </div>
  );
};

export default StaffLayout;
