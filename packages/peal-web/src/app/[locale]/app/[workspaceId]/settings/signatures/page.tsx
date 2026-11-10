import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { maxSignaturesPerWorkspace } from "peal-contract";

import { SignaturesSettings } from "#components/signatures/signatures-settings.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// A workspace's signatures, for members who may read its posts. Adding,
// changing or deleting one takes post:update.
const SignaturesPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/settings/signatures">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const may = new Set(workspace.permissions);

  if (!may.has("post:read")) {
    notFound();
  }

  const t = await getTranslations("Signatures");
  const mayManage = may.has("post:update");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t("description")}</p>
      <p className="text-muted-foreground text-sm">
        {t("rules", { max: maxSignaturesPerWorkspace })}
      </p>
      {mayManage ? null : (
        <p className="text-muted-foreground text-sm">{t("readOnly")}</p>
      )}
      <SignaturesSettings workspaceId={workspace.id} mayManage={mayManage} />
    </div>
  );
};

export default SignaturesPage;
