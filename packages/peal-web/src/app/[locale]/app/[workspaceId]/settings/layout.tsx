import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Button } from "peal-ui/components/button";

import { SettingsNav } from "#components/settings/settings-nav.tsx";
import type { SettingsSection } from "#components/settings/settings-nav.tsx";
import { Link } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// The frame of a workspace's settings: its name, and the pages its member
// may open, as GET /api/me lists their permissions.
const WorkspaceSettingsLayout = async ({
  children,
  params,
}: LayoutProps<"/[locale]/app/[workspaceId]/settings">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const t = await getTranslations("WorkspaceSettings");
  const may = new Set(workspace.permissions);

  const allowed: Readonly<Record<SettingsSection, boolean>> = {
    apiKeys: may.has("apiKey:read"),
    channelSets: may.has("post:read") && may.has("channel:read"),
    general: true,
    invitations: may.has("invitation:create"),
    members: true,
    partner: may.has("partner:read"),
    queues: may.has("post:read") && may.has("channel:read"),
    // What the workspace requires of its members, which every member reads.
    security: true,
    signatures: may.has("post:read"),
    tags: may.has("post:read"),
    webhooks: may.has("webhook:read"),
  };

  const sections = (
    [
      "general",
      "members",
      "invitations",
      "security",
      "tags",
      "signatures",
      "channelSets",
      "queues",
      "apiKeys",
      "webhooks",
      "partner",
    ] satisfies SettingsSection[]
  ).filter((section) => allowed[section]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div>
          <Button
            variant="link"
            size="sm"
            render={<Link href="/app" />}
            nativeButton={false}
          >
            {t("back")}
          </Button>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description", { workspace: workspace.name })}
        </p>
      </div>
      <SettingsNav sections={sections} workspaceId={workspace.id} />
      {children}
    </div>
  );
};

export default WorkspaceSettingsLayout;
