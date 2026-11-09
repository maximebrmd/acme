import { Option, Schema } from "effect";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { CalendarScreen } from "#components/posts/calendar-screen.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";
import { DateKeySchema, parseDate } from "#posts/zoned-time.ts";

const decodeDateKey = Schema.decodeUnknownOption(DateKeySchema);

// The workspace's scheduled posts, by week or by month. `?date=YYYY-MM-DD`
// opens on the week of that date.
const CalendarPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/app/[workspaceId]/calendar">) => {
  const { locale, workspaceId } = await params;
  const { date } = await searchParams;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);

  return (
    <CalendarScreen
      initialDate={Option.getOrUndefined(
        decodeDateKey(date).pipe(Option.flatMap(parseDate))
      )}
      permissions={membership.permissions}
      workspaceId={membership.id}
    />
  );
};

export default CalendarPage;
