import { Button } from "acme-ui/components/button";
import { Option } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { currentUser } from "#auth/session.ts";
import { ChannelsSettings } from "#components/channels/channels-settings.tsx";
import { Link, redirect } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";

// A workspace's channels: the accounts it posts to. The list loads in the
// browser, with the member's session; what the member may do comes from
// GET /api/me.
const ChannelsPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/channels">) => {
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

  const t = await getTranslations("ChannelsPage");
  const may = new Set(workspace.permissions);

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
      <ChannelsSettings
        workspaceId={workspace.id}
        canConnect={may.has("channel:connect")}
        canDisconnect={may.has("channel:disconnect")}
      />
    </div>
  );
};

export default ChannelsPage;
