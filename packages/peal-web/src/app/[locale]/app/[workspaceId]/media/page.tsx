import { Option } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { canGenerateImages } from "#assistant/permissions.ts";
import { currentUser } from "#auth/session.ts";
import { MediaLibrary } from "#components/media/media-library.tsx";
import { redirect } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";

// A workspace's media library, for its members: what they may do there
// decides whether they see the uploader and the delete buttons. Anyone
// signed out is sent to sign in; a workspace they do not belong to does not
// exist for them.
const MediaPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/media">) => {
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

  const t = await getTranslations("Media.page");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description", { workspace: workspace.name })}
        </p>
      </div>
      <MediaLibrary
        workspaceId={workspace.id}
        canGenerate={canGenerateImages(workspace.permissions)}
        canUpload={workspace.permissions.includes("media:upload")}
        canDelete={workspace.permissions.includes("media:delete")}
        mayConfigure={workspace.permissions.includes("assistant:configure")}
      />
    </div>
  );
};

export default MediaPage;
