import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ThreadScreen } from "#components/inbox/thread-screen.tsx";
import { Link } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// One thread of the inbox: the comments under a post on one channel, for
// members who may read them (engagement:read). Answering and moderating
// take engagement:reply.
const InboxThreadPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/inbox/[threadId]">) => {
  const { locale, threadId, workspaceId } = await params;

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
        <Link
          href={`/app/${membership.id}/inbox`}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          {t("thread.back")}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("thread.title")}
        </h1>
      </div>
      <ThreadScreen
        mayReply={may.has("engagement:reply")}
        threadId={threadId}
        workspaceId={membership.id}
      />
    </div>
  );
};

export default InboxThreadPage;
