import { Button } from "peal-ui/components/button";
import { Option } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { currentUser } from "#auth/session.ts";
import { NoticeList } from "#components/notices/notice-list.tsx";
import { Link, redirect } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";

// The signed-in user's notices, across their workspaces, which the list
// names from GET /api/me. Anyone signed out is sent to sign in.
const NoticesPage = async ({ params }: PageProps<"/[locale]/app/notices">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const me = await currentUser();

  if (Option.isNone(me)) {
    return redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("Notices.page");

  const workspaces = Object.fromEntries(
    me.value.workspaces.map(({ id, name }) => [id, name])
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/app/notices/preferences" />}
          nativeButton={false}
        >
          {t("preferences")}
        </Button>
      </div>
      <NoticeList workspaces={workspaces} />
    </div>
  );
};

export default NoticesPage;
