import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ApprovalsList } from "#components/review/approvals-list.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// The workspace's posts that wait for an approval, each opening on its
// page, where those who may approve decide.
const ApprovalsPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/approvals">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);
  const t = await getTranslations("Review");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("approvals.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("approvals.description", { workspace: membership.name })}
        </p>
      </div>
      <ApprovalsList workspaceId={membership.id} />
    </div>
  );
};

export default ApprovalsPage;
