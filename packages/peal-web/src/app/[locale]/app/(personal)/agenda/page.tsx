import { Option } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { currentUser } from "#auth/session.ts";
import { AgendaScreen } from "#components/overview/agenda-screen.tsx";
import { redirect } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";

// What goes out across the signed-in person's workspaces, which the list
// names from GET /api/me: those where they may read posts. A list, not
// the week's grid: nothing is moved across workspaces. Anyone signed out
// is sent to sign in.
const AgendaPage = async ({ params }: PageProps<"/[locale]/app/agenda">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const me = await currentUser();

  if (Option.isNone(me)) {
    return redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("Overview.agenda");

  const workspaces = me.value.workspaces
    .filter(({ permissions }) => permissions.includes("post:read"))
    .map(({ id, name }) => ({ id, name }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <AgendaScreen workspaces={workspaces} />
    </div>
  );
};

export default AgendaPage;
