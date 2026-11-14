import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ReviewScreen } from "#components/inbox/review-screen.tsx";
import { Link } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// One location's reviews, for members who may read them
// (engagement:read). Answering takes engagement:reply.
const InboxReviewsPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/inbox/reviews/[threadId]">) => {
  const { locale, threadId, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);
  const may = new Set(membership.permissions);

  if (!may.has("engagement:read")) {
    notFound();
  }

  const t = await getTranslations("InboxReviews");

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
      <ReviewScreen
        mayReply={may.has("engagement:reply")}
        threadId={threadId}
        workspaceId={membership.id}
      />
    </div>
  );
};

export default InboxReviewsPage;
