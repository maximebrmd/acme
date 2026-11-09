import { Option } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { currentUser } from "#auth/session.ts";
import { MembersList } from "#components/settings/members-list.tsx";
import { redirect } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";

// A workspace's members: everyone sees them; owners and admins change roles
// and remove people, as Better Auth's organization routes allow.
const MembersPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/settings/members">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const me = await currentUser();

  if (Option.isNone(me)) {
    return redirect({ href: "/sign-in", locale });
  }

  const workspace = me.value.workspaces.find(({ id }) => id === workspaceId);

  if (workspace === undefined) {
    notFound();
  }

  const t = await getTranslations("WorkspaceSettings.members");
  const may = new Set(workspace.permissions);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t("description")}</p>
      <MembersList
        workspaceId={workspace.id}
        manager={{
          mayRemove: may.has("member:delete"),
          mayUpdate: may.has("member:update"),
          role: workspace.role,
          userId: me.value.user.id,
        }}
      />
    </div>
  );
};

export default MembersPage;
