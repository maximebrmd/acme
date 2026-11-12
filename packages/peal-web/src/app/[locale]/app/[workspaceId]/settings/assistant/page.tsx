import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { ImageProviderSettings } from "#components/assistant/image-provider-settings.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// The assistant's settings: the image provider the workspace brings, for
// members with assistant:configure (owners and admins).
const AssistantSettingsPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/settings/assistant">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);

  if (!workspace.permissions.includes("assistant:configure")) {
    notFound();
  }

  return <ImageProviderSettings workspaceId={workspace.id} />;
};

export default AssistantSettingsPage;
