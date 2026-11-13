import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { WorkspaceHome } from "#components/home/workspace-home.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";
import { hrefOf } from "#shell/navigation.ts";

// The workspace's home: connecting channels and assistants, and a
// quickstart for an agent or an app.
const WorkspaceHomePage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);

  return (
    <WorkspaceHome
      channelsHref={hrefOf(membership.id, "channels")}
      keysHref={
        membership.permissions.includes("apiKey:read")
          ? hrefOf(membership.id, "apiKeys")
          : null
      }
    />
  );
};

export default WorkspaceHomePage;
