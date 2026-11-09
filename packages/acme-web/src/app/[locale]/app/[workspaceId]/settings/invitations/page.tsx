import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import {
  InviteForm,
  PendingInvitations,
} from "#components/settings/invitations.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";
import { assignableRoles } from "#settings/member-rules.ts";

// Inviting people to a workspace, and the invitations still pending, for
// members who may invite.
const InvitationsPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/settings/invitations">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const may = new Set(workspace.permissions);

  if (!may.has("invitation:create")) {
    notFound();
  }

  const t = await getTranslations("WorkspaceSettings.invitations");

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="invite-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="invite-title" className="text-xl font-semibold">
            {t("title")}
          </h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <InviteForm
          workspaceId={workspace.id}
          roles={assignableRoles({ role: workspace.role, userId: "" })}
        />
      </section>
      <PendingInvitations
        workspaceId={workspace.id}
        mayCancel={may.has("invitation:cancel")}
        mayResend={may.has("invitation:create")}
      />
    </div>
  );
};

export default InvitationsPage;
