import { Option, Schema } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { RecyclingSettings } from "#components/recycling/recycling-settings.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

const decodeRule = Schema.decodeUnknownOption(Schema.String);

// A workspace's recycling rules, for members who may read its posts.
// Pausing, resuming or stopping one takes post:schedule; `rule` marks the
// one a notice opened the page for.
const RecyclingPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/app/[workspaceId]/settings/recycling">) => {
  const { locale, workspaceId } = await params;
  const { rule } = await searchParams;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const may = new Set(workspace.permissions);

  if (!may.has("post:read")) {
    notFound();
  }

  const t = await getTranslations("Recycling");
  const mayChange = may.has("post:schedule");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t("description")}</p>
      {mayChange ? null : (
        <p className="text-muted-foreground text-sm">{t("readOnly")}</p>
      )}
      <RecyclingSettings
        workspaceId={workspace.id}
        mayChange={mayChange}
        highlighted={Option.getOrNull(decodeRule(rule))}
      />
    </div>
  );
};

export default RecyclingPage;
