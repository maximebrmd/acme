import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { MessageScreen } from "#components/inbox/message-screen.tsx";
import { Link } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// One conversation, for members who may read the inbox
// (engagement:read). Answering takes engagement:message.
const InboxConversationPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/inbox/messages/[conversationId]">) => {
  const { conversationId, locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);
  const may = new Set(membership.permissions);

  if (!may.has("engagement:read")) {
    notFound();
  }

  const t = await getTranslations("InboxMessages");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href={`/app/${membership.id}/inbox`}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          {t("thread.back")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("thread.title")}
        </h1>
      </div>
      <MessageScreen
        conversationId={conversationId}
        mayAnswer={may.has("engagement:message")}
        workspaceId={membership.id}
      />
    </div>
  );
};

export default InboxConversationPage;
