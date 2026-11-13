import { Option } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { currentUser } from "#auth/session.ts";
import { NotificationPreferencesForm } from "#components/notices/notification-preferences-form.tsx";
import { Link, redirect } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";

// Which notices the signed-in user also receives by email. Anyone signed
// out is sent to sign in.
const NotificationPreferencesPage = async ({
  params,
}: PageProps<"/[locale]/app/notices/preferences">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const me = await currentUser();

  if (Option.isNone(me)) {
    return redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("Notices.preferences");

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/app/notices"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          {t("back")}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <NotificationPreferencesForm />
    </div>
  );
};

export default NotificationPreferencesPage;
