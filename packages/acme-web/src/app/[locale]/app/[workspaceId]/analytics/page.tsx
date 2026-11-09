import { Option, Schema } from "effect";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { defaultRange, RangeSchema } from "#analytics/report.ts";
import { AnalyticsScreen } from "#components/analytics/analytics-screen.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

const decodeRange = Schema.decodeUnknownOption(RangeSchema);

// How the workspace's posts did on their platforms, for members who may
// read its analytics. `?range=7`, `30` or `90` picks the days it opens on.
const AnalyticsPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/app/[workspaceId]/analytics">) => {
  const { locale, workspaceId } = await params;
  const { range } = await searchParams;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);

  if (!membership.permissions.includes("analytics:read")) {
    notFound();
  }

  return (
    <AnalyticsScreen
      initialRange={Option.getOrElse(decodeRange(range), () => defaultRange)}
      workspaceId={membership.id}
    />
  );
};

export default AnalyticsPage;
