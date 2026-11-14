import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { MessageSettingsPanel } from "#components/inbox/message-settings.tsx";
import { MessagesList } from "#components/inbox/messages-list.tsx";
import { ReviewsList } from "#components/inbox/reviews-list.tsx";
import { ThreadsList } from "#components/inbox/threads-list.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// The workspace's inbox: the comments people leave under its published
// posts, the reviews of its locations, and its channels' direct messages,
// for members who may read them (engagement:read; the messages,
// engagement:readMessages). Members who connect channels choose whose
// messages Peal reads (channel:connect), and owners which applications
// may read them (organization:secure).
const InboxPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/inbox">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);
  const may = new Set(membership.permissions);

  if (!may.has("engagement:read")) {
    notFound();
  }

  const t = await getTranslations("Inbox");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description", { workspace: membership.name })}
        </p>
      </div>
      <ThreadsList workspaceId={membership.id} />
      <ReviewsList workspaceId={membership.id} />
      {may.has("engagement:readMessages") ? (
        <MessagesList workspaceId={membership.id} />
      ) : null}
      {may.has("channel:connect") ? (
        <MessageSettingsPanel
          mayAllowApplications={may.has("organization:secure")}
          workspaceId={membership.id}
        />
      ) : null}
    </div>
  );
};

export default InboxPage;
