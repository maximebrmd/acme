import { Option, Schema } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { FeedsSettings } from "#components/feeds/feeds-settings.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

const decodeFeed = Schema.decodeUnknownOption(Schema.String);

// A workspace's feeds, for members who may read its posts. Adding,
// pausing, resuming or deleting one takes post:create, and a feed that
// puts posts on a queue post:schedule; `feed` marks the one a notice
// opened the page for.
const FeedsPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/app/[workspaceId]/settings/feeds">) => {
  const { locale, workspaceId } = await params;
  const { feed } = await searchParams;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const may = new Set(workspace.permissions);

  if (!may.has("post:read")) {
    notFound();
  }

  const t = await getTranslations("Feeds");
  const mayChange = may.has("post:create");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t("description")}</p>
      {mayChange ? null : (
        <p className="text-muted-foreground text-sm">{t("readOnly")}</p>
      )}
      <FeedsSettings
        workspaceId={workspace.id}
        mayChange={mayChange}
        mayQueue={may.has("post:schedule")}
        highlighted={Option.getOrNull(decodeFeed(feed))}
      />
    </div>
  );
};

export default FeedsPage;
