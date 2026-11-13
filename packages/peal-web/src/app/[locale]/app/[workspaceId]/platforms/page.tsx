import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { PlatformsScreen } from "#components/platforms/platforms-screen.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// The Console's Platforms page, for members who may read channels (the
// capabilities' endpoint asks channel:read): not found otherwise.
const PlatformsPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/platforms">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);

  if (!membership.permissions.includes("channel:read")) {
    notFound();
  }

  return <PlatformsScreen workspaceId={membership.id} />;
};

export default PlatformsPage;
