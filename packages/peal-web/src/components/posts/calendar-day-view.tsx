import { DateTime } from "effect";
import { ListOrderedIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useTimeOptions } from "#i18n/hour-cycle.ts";
import { offsetChangesOn } from "#posts/day-rows.ts";
import type { DayRow } from "#posts/day-rows.ts";
import type { CalendarDate } from "#posts/zoned-time.ts";

interface DayPlaced {
  readonly at: DateTime.Utc;
  readonly post: { readonly id: string; readonly queueId: string | null };
}

export interface CalendarDayViewProps<Placed extends DayPlaced> {
  readonly date: CalendarDate;
  /** The link that starts a post on the day, if one can. */
  readonly dayStart: ReactNode;
  readonly renderPost: (placed: Placed) => ReactNode;
  /** The link that starts a post at a free slot's time, if one can. */
  readonly renderStart: (at: DateTime.Utc) => ReactNode;
  readonly rows: readonly DayRow<Placed>[];
  readonly timeZone: string;
}

/**
 * The calendar's day: a row for each time that holds a post or a queue's
 * slot, on the viewer's clock, each free slot named by its queue, and one
 * held by a post the filters hide said to be taken, with no new post. On a day
 * the clocks change, every time carries its offset, as one may show twice.
 * Links come from the screen, so the view renders outside Next.
 */
export const CalendarDayView = <Placed extends DayPlaced>({
  date,
  dayStart,
  renderPost,
  renderStart,
  rows,
  timeZone,
}: CalendarDayViewProps<Placed>) => {
  const t = useTranslations("Posts.Calendar");
  const format = useFormatter();
  const timeOptions = useTimeOptions();
  const withOffset = offsetChangesOn(date, timeZone);

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-2">
      <div className="flex items-center justify-end">{dayStart}</div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground p-2 text-sm">{t("emptyDay")}</p>
      ) : (
        <ol aria-label={t("dayRows")} className="flex flex-col">
          {rows.map((row) => (
            <li
              key={DateTime.toEpochMillis(row.at)}
              className="flex gap-3 border-b px-1 py-2 last:border-b-0"
            >
              <time
                dateTime={DateTime.formatIso(row.at)}
                className="text-muted-foreground w-24 shrink-0 font-mono text-xs tabular-nums"
              >
                {/* A style cannot take the zone's name: its parts can. */}
                {withOffset
                  ? format.dateTime(DateTime.toDate(row.at), {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone,
                      timeZoneName: "short",
                      ...timeOptions,
                    })
                  : format.dateTime(DateTime.toDate(row.at), {
                      timeStyle: "short",
                      timeZone,
                      ...timeOptions,
                    })}
              </time>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {row.posts.map((placed) => (
                  <div key={placed.post.id}>{renderPost(placed)}</div>
                ))}
                {row.openSlots.map((slot) => (
                  <div
                    key={slot.queueId}
                    className="text-muted-foreground flex items-center gap-1 rounded-md border border-dashed px-1 py-0.5 text-xs"
                  >
                    <ListOrderedIcon aria-hidden className="size-3 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {t("openSlot", { queue: slot.queueName })}
                    </span>
                    {renderStart(slot.at)}
                  </div>
                ))}
                {row.heldSlots.map((slot) => (
                  <div
                    key={slot.queueId}
                    className="text-muted-foreground flex items-center gap-1 rounded-md border px-1 py-0.5 text-xs"
                  >
                    <ListOrderedIcon aria-hidden className="size-3 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {t("heldSlot", { queue: slot.queueName })}
                    </span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
