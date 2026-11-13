import { Option } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { currentUser } from "#auth/session.ts";
import { ReportScreen } from "#components/overview/report-screen.tsx";
import { redirect } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";

// What went out in each of the signed-in person's workspaces and how it
// did, beside the days before, as GET /api/me/report answers it, with its
// CSV. Anyone signed out is sent to sign in.
const ReportPage = async ({ params }: PageProps<"/[locale]/app/report">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const me = await currentUser();

  if (Option.isNone(me)) {
    return redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("Overview.report");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <ReportScreen />
    </div>
  );
};

export default ReportPage;
