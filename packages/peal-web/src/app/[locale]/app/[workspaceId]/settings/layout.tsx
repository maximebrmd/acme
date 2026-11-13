import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { PageHeading } from "#components/shell/page-heading.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// The frame of a workspace's settings: the open page's name. The sidebar
// lists the pages its member may open, as GET /api/me lists their
// permissions (#shell/navigation.ts).
const WorkspaceSettingsLayout = async ({
  children,
  params,
}: LayoutProps<"/[locale]/app/[workspaceId]/settings">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);

  return (
    <div className="flex flex-col gap-8">
      <PageHeading workspaceId={workspace.id} />
      {children}
    </div>
  );
};

export default WorkspaceSettingsLayout;
