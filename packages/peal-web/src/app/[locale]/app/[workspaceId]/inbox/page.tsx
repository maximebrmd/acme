import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ThreadsList } from "#components/inbox/threads-list.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// The workspace's inbox: the comments people leave under its published
// posts, for members who may read them (engagement:read).
const InboxPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/inbox">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);

  if (!membership.permissions.includes("engagement:read")) {
    notFound();
  }

  const t = await getTranslations("Inbox");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description", { workspace: membership.name })}
        </p>
      </div>
      <ThreadsList workspaceId={membership.id} />
    </div>
  );
};

export default InboxPage;
