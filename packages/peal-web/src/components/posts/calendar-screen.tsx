"use client";

import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
import type { DragDropEventHandlers } from "@dnd-kit/react";
import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { DateTime, Exit, Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  GripVerticalIcon,
  ImagesIcon,
  PlusIcon,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { Channel, Permission, Post, Tag } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "peal-ui/components/tabs";
import { cn } from "peal-ui/lib/utils";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { useOfferUpgrade } from "#components/billing/use-offer-upgrade.ts";
import { CalendarFilters } from "#components/posts/calendar-filters.tsx";
import { ChipTags } from "#components/posts/chip-tags.tsx";
import { useTimeOptions } from "#i18n/hour-cycle.ts";
import { Link } from "#i18n/navigation.ts";
import {
  postsKeys,
  reschedulePost,
  scheduledPosts,
  workspaceChannels,
} from "#posts/api.ts";
import { filtered, knownFilter, noFilter } from "#posts/calendar-filter.ts";
import type { CalendarFilter } from "#posts/calendar-filter.ts";
import { failureOf } from "#posts/outcome.ts";
import { isAhead, startAtOf, startTimeOn } from "#posts/start-time.ts";
import { useMounted } from "#posts/use-mounted.ts";
import {
  addDays,
  addMonths,
  browserTimeZone,
  dateKey,
  firstDayOfWeek,
  monthOf,
  movedTo,
  rangeOf,
  wallClockOf,
  weekOf,
} from "#posts/zoned-time.ts";
import type { CalendarDate, TimeOfDay } from "#posts/zoned-time.ts";
import { workspaceTags } from "#tags/atoms.ts";
import { tagsOf } from "#tags/post-tags.ts";

const ViewSchema = Schema.Literals(["week", "month"]);

type View = typeof ViewSchema.Type;

const decodeView = Schema.decodeUnknownOption(ViewSchema);

const hours = Array.from({ length: 24 }, (_, hour) => hour);

/** A cell posts can be dropped on: a day, and an hour in the week view. */
interface Slot {
  readonly date: CalendarDate;
  readonly hour: number | undefined;
}

const slotId = (date: CalendarDate, hour?: number) =>
  hour === undefined ? dateKey(date) : `${dateKey(date)}T${hour}`;

const utcDate = ({ day, month, year }: CalendarDate) =>
  new Date(Date.UTC(year, month - 1, day));

const todayIn = (timeZone: string): CalendarDate =>
  Option.match(wallClockOf(DateTime.nowUnsafe(), timeZone), {
    onNone: () => {
      const { day, month, year } = DateTime.toParts(DateTime.nowUnsafe());

      return { day, month, year };
    },
    onSome: ({ date }) => date,
  });

/** A post where the viewer's clock shows it. */
interface Placed {
  readonly at: DateTime.Utc;
  readonly date: CalendarDate;
  readonly hour: number;
  readonly post: Post;
}

const placedIn = (posts: readonly Post[], timeZone: string): Placed[] =>
  posts.flatMap((post) => {
    const { schedule } = post;

    // A cancelled post keeps its time, but no longer goes out.
    if (schedule === null || post.status === "cancelled") {
      return [];
    }

    return Option.toArray(wallClockOf(schedule.at, timeZone)).map(
      ({ date, time }) => ({ at: schedule.at, date, hour: time.hour, post })
    );
  });

// A scheduled post moves, and so does one that waits for an approval: it
// keeps waiting, for its new time.
const hasMovableTime = ({ status }: Post) =>
  status === "scheduled" || status === "awaitingApproval";

const firstLine = (post: Post) =>
  post.content.text.split("\n")[0]?.trim() ?? "";

const chipTone: Record<Post["status"], string> = {
  awaitingApproval: "border border-dashed border-border text-foreground",
  cancelled: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  finished: "bg-muted text-muted-foreground",
  publishing: "bg-secondary text-secondary-foreground",
  scheduled: "bg-primary/10 text-foreground",
};

interface PostChipProps {
  readonly movable: boolean;
  readonly placed: Placed;
  /** The workspace's tags, which name the post's. */
  readonly tags: readonly Tag[];
  readonly timeZone: string;
  readonly workspaceId: string;
}

// A post on the calendar: a link to it in the composer, a handle to drag it
// to another time when it is still scheduled, the colours of its tags, and
// a mark when it shows images or videos.
const PostChip = ({
  movable,
  placed,
  tags,
  timeZone,
  workspaceId,
}: PostChipProps) => {
  const t = useTranslations("Posts");
  const tMedia = useTranslations("PostMedia");
  const format = useFormatter();
  const timeOptions = useTimeOptions();
  const [handle, setHandle] = useState<Element | null>(null);
  const media = placed.post.content.media.length;
  const filed = tagsOf(placed.post.tagIds, tags);

  const tagNames = t("Calendar.tagNames", {
    count: filed.length,
    tags: format.list(
      filed.map(({ name }) => name),
      { type: "conjunction" }
    ),
  });

  const { isDragging, ref } = useDraggable({
    disabled: !movable,
    handle,
    id: placed.post.id,
  });

  const time = format.dateTime(DateTime.toDate(placed.at), {
    timeStyle: "short",
    timeZone,
    ...timeOptions,
  });

  const text = firstLine(placed.post);
  const shown = text === "" ? t("Calendar.noText") : text;

  const label = t("Calendar.postLabel", {
    status: t("status", { status: placed.post.status }),
    text: shown,
    time,
  });

  return (
    <div
      ref={ref}
      className={cn(
        "flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-xs",
        chipTone[placed.post.status],
        isDragging ? "opacity-50" : null
      )}
    >
      {movable ? (
        <button
          ref={setHandle}
          type="button"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 shrink-0 cursor-grab rounded-sm outline-none focus-visible:ring-3"
        >
          <GripVerticalIcon className="size-3" aria-hidden />
          <span className="sr-only">
            {t("Calendar.moveHandle", { post: shown, time })}
          </span>
        </button>
      ) : null}
      <Link
        href={`/app/${workspaceId}/posts/${placed.post.id}`}
        className="min-w-0 flex-1 truncate underline-offset-2 hover:underline"
        aria-label={filed.length === 0 ? label : `${label} ${tagNames}`}
      >
        {t("Calendar.post", { text: shown, time })}
      </Link>
      <ChipTags tags={filed} title={tagNames} />
      {media === 0 ? null : (
        <span
          title={tMedia("calendar", { count: media })}
          className="text-muted-foreground shrink-0"
        >
          <ImagesIcon aria-hidden className="size-3" />
          <span className="sr-only">
            {tMedia("calendar", { count: media })}
          </span>
        </span>
      )}
    </div>
  );
};

interface DropCellProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly id: string;
}

// A cell of the calendar a post can be dropped on.
const DropCell = ({ children, className, id }: DropCellProps) => {
  const { isDropTarget, ref } = useDroppable({ id });

  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full flex-col gap-1 p-1",
        isDropTarget ? "bg-accent" : null,
        className
      )}
    >
      {children}
    </div>
  );
};

interface NewPostLinkProps {
  readonly className?: string;
  readonly date: CalendarDate;
  readonly time: TimeOfDay;
  readonly workspaceId: string;
}

// Opens the composer on a new post that starts at a date and time of the
// calendar, on the viewer's clock.
const NewPostLink = ({
  className,
  date,
  time,
  workspaceId,
}: NewPostLinkProps) => {
  const t = useTranslations("Posts.Calendar");
  const format = useFormatter();
  const timeOptions = useTimeOptions();

  const label = t("newPostAt", {
    date: format.dateTime(utcDate(date), {
      dateStyle: "full",
      timeZone: "UTC",
    }),
    time: format.dateTime(Date.UTC(2000, 0, 1, time.hour, time.minute), {
      timeStyle: "short",
      timeZone: "UTC",
      ...timeOptions,
    }),
  });

  return (
    <Link
      href={`/app/${workspaceId}/posts/new?at=${startAtOf(date, time)}`}
      title={label}
      className={cn(
        "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 w-fit shrink-0 rounded-sm outline-none focus-visible:ring-3",
        className
      )}
    >
      <PlusIcon className="size-3.5" aria-hidden />
      <span className="sr-only">{label}</span>
    </Link>
  );
};

interface GridProps {
  readonly days: readonly CalendarDate[];
  readonly movable: boolean;
  readonly placed: readonly Placed[];
  /**
   * The time a new post would start at on a day, or in one of its hours:
   * none for a time that has passed, or a member who may not write posts.
   */
  readonly startOf: (
    date: CalendarDate,
    hour: number | undefined
  ) => Option.Option<TimeOfDay>;
  /** The workspace's tags. */
  readonly tags: readonly Tag[];
  readonly timeZone: string;
  readonly today: CalendarDate;
  readonly workspaceId: string;
}

// The link that starts a post at a day or an hour, when one can.
const startLink = (
  { startOf, workspaceId }: Pick<GridProps, "startOf" | "workspaceId">,
  date: CalendarDate,
  hour: number | undefined,
  className?: string
) =>
  Option.match(startOf(date, hour), {
    onNone: () => null,
    onSome: (time) => (
      <NewPostLink
        date={date}
        time={time}
        workspaceId={workspaceId}
        {...(className === undefined ? {} : { className })}
      />
    ),
  });

const WeekGrid = ({
  days,
  movable,
  placed,
  startOf,
  tags,
  timeZone,
  today,
  workspaceId,
}: GridProps) => {
  const t = useTranslations("Posts.Calendar");
  const format = useFormatter();
  const timeOptions = useTimeOptions();

  return (
    <div className="max-h-screen overflow-auto rounded-lg border">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead className="bg-background sticky top-0 z-10">
          <tr>
            <th scope="col" className="w-16 border-b">
              <span className="sr-only">{t("hour")}</span>
            </th>
            {days.map((day) => (
              <th
                key={dateKey(day)}
                scope="col"
                className={cn(
                  "border-b border-l p-2 text-left font-medium",
                  dateKey(day) === dateKey(today) ? "bg-muted" : null
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  {format.dateTime(utcDate(day), {
                    day: "numeric",
                    timeZone: "UTC",
                    weekday: "short",
                  })}
                  {startLink({ startOf, workspaceId }, day, undefined)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour}>
              <th
                scope="row"
                className="text-muted-foreground border-b p-1 text-right align-top text-xs font-normal"
              >
                {format.dateTime(Date.UTC(2000, 0, 1, hour), {
                  hour: "numeric",
                  timeZone: "UTC",
                  ...timeOptions,
                })}
              </th>
              {days.map((day) => (
                <td
                  key={dateKey(day)}
                  className="group/slot h-12 border-b border-l align-top"
                >
                  <DropCell id={slotId(day, hour)}>
                    {placed
                      .filter(
                        (item) =>
                          item.hour === hour &&
                          dateKey(item.date) === dateKey(day)
                      )
                      .map((item) => (
                        <PostChip
                          key={item.post.id}
                          movable={movable && hasMovableTime(item.post)}
                          placed={item}
                          tags={tags}
                          timeZone={timeZone}
                          workspaceId={workspaceId}
                        />
                      ))}
                    {startLink(
                      { startOf, workspaceId },
                      day,
                      hour,
                      "opacity-0 group-hover/slot:opacity-100 focus-visible:opacity-100"
                    )}
                  </DropCell>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const shownPerDay = 3;

const MonthGrid = ({
  anchor,
  days,
  movable,
  placed,
  startOf,
  tags,
  timeZone,
  today,
  workspaceId,
}: GridProps & { readonly anchor: CalendarDate }) => {
  const t = useTranslations("Posts.Calendar");
  const format = useFormatter();
  const weekdays = days.slice(0, 7);

  const weeks = Array.from({ length: days.length / 7 }, (_, week) =>
    days.slice(week * 7, week * 7 + 7)
  );

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>
            {weekdays.map((day) => (
              <th
                key={dateKey(day)}
                scope="col"
                className="border-b p-2 text-left font-medium"
              >
                {format.dateTime(utcDate(day), {
                  timeZone: "UTC",
                  weekday: "short",
                })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={dateKey(week[0] ?? anchor)}>
              {week.map((day) => {
                const onDay = placed.filter(
                  (item) => dateKey(item.date) === dateKey(day)
                );

                return (
                  <td
                    key={dateKey(day)}
                    className="h-28 border-b border-l align-top"
                  >
                    <DropCell id={slotId(day)}>
                      <span className="flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            "text-xs",
                            day.month === anchor.month
                              ? null
                              : "text-muted-foreground",
                            dateKey(day) === dateKey(today)
                              ? "bg-primary text-primary-foreground w-fit rounded-full px-1.5 font-semibold"
                              : null
                          )}
                        >
                          {format.dateTime(utcDate(day), {
                            day: "numeric",
                            timeZone: "UTC",
                          })}
                        </span>
                        {startLink({ startOf, workspaceId }, day, undefined)}
                      </span>
                      {onDay.slice(0, shownPerDay).map((item) => (
                        <PostChip
                          key={item.post.id}
                          movable={movable && hasMovableTime(item.post)}
                          placed={item}
                          tags={tags}
                          timeZone={timeZone}
                          workspaceId={workspaceId}
                        />
                      ))}
                      {onDay.length > shownPerDay ? (
                        <span className="text-muted-foreground text-xs">
                          {t("more", { count: onDay.length - shownPerDay })}
                        </span>
                      ) : null}
                    </DropCell>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface CalendarViewProps {
  readonly initialDate: CalendarDate | undefined;
  readonly permissions: readonly Permission[];
  readonly timeZone: string;
  readonly workspaceId: string;
}

const CalendarView = ({
  initialDate,
  permissions,
  timeZone,
  workspaceId,
}: CalendarViewProps) => {
  const t = useTranslations("Posts.Calendar");
  const billing = useTranslations("Billing");
  const format = useFormatter();
  const locale = useLocale();
  const firstDay = firstDayOfWeek(locale);
  const today = todayIn(timeZone);
  const timeOptions = useTimeOptions();
  const [view, setView] = useState<View>("week");
  const [chosen, setChosen] = useState<CalendarFilter>(noFilter);
  const [anchor, setAnchor] = useState<CalendarDate>(initialDate ?? today);
  const reschedule = useAtomSet(reschedulePost, { mode: "promiseExit" });
  const offerUpgrade = useOfferUpgrade();

  const days =
    view === "week" ? weekOf(anchor, firstDay) : monthOf(anchor, firstDay);

  const movable = permissions.includes("post:schedule");

  const range = Option.getOrElse(rangeOf(days, timeZone), () => {
    const now = DateTime.nowUnsafe();

    return { from: now, to: DateTime.add(now, { days: 1 }) };
  });

  const query = scheduledPosts(workspaceId, range.from, range.to);
  const result = useAtomValue(query);
  const retry = useAtomRefresh(query);

  const posts = Option.getOrElse(
    AsyncResult.value(result),
    (): readonly Post[] => []
  );

  // The workspace's tags and channels, for the filters and the chips; none
  // while they load, or for a member who may not read them.
  const tags = Option.getOrElse(
    AsyncResult.value(useAtomValue(workspaceTags(workspaceId))),
    (): readonly Tag[] => []
  );

  const channels = Option.getOrElse(
    AsyncResult.value(useAtomValue(workspaceChannels(workspaceId))),
    (): readonly Channel[] => []
  );

  const filter = knownFilter(chosen, {
    channelIds: channels.map(({ id }) => id),
    tagIds: tags.map(({ id }) => id),
  });

  const { hidden, shown: placed } = filtered(filter, placedIn(posts, timeZone));

  const mayCreate = permissions.includes("post:create");
  const now = DateTime.nowUnsafe();

  const startOf: GridProps["startOf"] = (date, hour) => {
    if (!mayCreate) {
      return Option.none();
    }

    if (hour === undefined) {
      return startTimeOn(date, timeZone, now);
    }

    const time = { hour, minute: 0 };

    return isAhead(date, time, timeZone, now)
      ? Option.some(time)
      : Option.none();
  };

  const slots = new Map<string, Slot>(
    days.flatMap((date) =>
      view === "week"
        ? hours.map((hour): [string, Slot] => [
            slotId(date, hour),
            { date, hour },
          ])
        : [[slotId(date), { date, hour: undefined }]]
    )
  );

  const move = async (post: Post, slot: Slot) => {
    const { schedule } = post;

    if (schedule === null) {
      return;
    }

    const at = movedTo(schedule.at, timeZone, slot.date, slot.hour);

    if (Option.isNone(at) || DateTime.Equivalence(at.value, schedule.at)) {
      return;
    }

    const exit = await reschedule({
      params: { postId: post.id, workspaceId },
      payload: { at: at.value, timeZone: schedule.timeZone },
      reactivityKeys: postsKeys,
    });

    if (Exit.isSuccess(exit)) {
      toast.success(
        t("moved", {
          at: format.dateTime(DateTime.toDate(at.value), {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone,
            ...timeOptions,
          }),
        })
      );

      return;
    }

    offerUpgrade(exit);

    const reason = Option.map(failureOf(exit), ({ _tag }) => _tag);

    toast.error(
      Option.match(reason, {
        onNone: () => t("moveFailed"),
        onSome: (tag) => {
          if (tag === "ScheduleInPast") {
            return t("moveInPast");
          }

          if (tag === "PlanLimitReached") {
            return billing("limitReached", { limit: "scheduledPosts" });
          }

          return tag === "Forbidden" ? t("moveForbidden") : t("moveFailed");
        },
      })
    );
  };

  const handleDragEnd: DragDropEventHandlers["onDragEnd"] = (event) => {
    const { source, target } = event.operation;

    if (event.canceled || source === null || target === null) {
      return;
    }

    const post = posts.find(({ id }) => id === String(source.id));
    const slot = slots.get(String(target.id));

    if (post !== undefined && slot !== undefined) {
      void move(post, slot);
    }
  };

  const step = (direction: -1 | 1) => {
    setAnchor((current) =>
      view === "week"
        ? addDays(current, 7 * direction)
        : addMonths(current, direction)
    );
  };

  const first = days[0] ?? anchor;
  const last = days.at(-1) ?? anchor;

  const title =
    view === "week"
      ? format.dateTimeRange(utcDate(first), utcDate(last), {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
          year: "numeric",
        })
      : format.dateTime(utcDate(anchor), {
          month: "long",
          timeZone: "UTC",
          year: "numeric",
        });

  const grid = (() => {
    if (AsyncResult.isInitial(result)) {
      return (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">{t("loading")}</span>
          <Skeleton className="h-96 w-full" />
        </div>
      );
    }

    if (AsyncResult.isFailure(result)) {
      return (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-sm">{t("loadFailed")}</p>
          <Button variant="outline" size="sm" onClick={retry}>
            {t("retry")}
          </Button>
        </div>
      );
    }

    const props = {
      days,
      movable,
      placed,
      startOf,
      tags,
      timeZone,
      today,
      workspaceId,
    };

    return (
      <DragDropProvider onDragEnd={handleDragEnd}>
        {view === "week" ? (
          <WeekGrid {...props} />
        ) : (
          <MonthGrid {...props} anchor={anchor} />
        )}
      </DragDropProvider>
    );
  })();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description", { zone: timeZone.replaceAll("_", " ") })}
        </p>
      </div>
      <Tabs
        value={view}
        onValueChange={(value) => {
          const picked = decodeView(value);

          if (Option.isSome(picked)) {
            setView(picked.value);
          }
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList aria-label={t("views")}>
            <TabsTrigger value="week">{t("week")}</TabsTrigger>
            <TabsTrigger value="month">{t("month")}</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label={
                view === "week" ? t("previousWeek") : t("previousMonth")
              }
              onClick={() => {
                step(-1);
              }}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAnchor(today);
              }}
            >
              {t("today")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={view === "week" ? t("nextWeek") : t("nextMonth")}
              onClick={() => {
                step(1);
              }}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
        <h2 className="text-lg font-medium" aria-live="polite">
          {title}
        </h2>
        <CalendarFilters
          channels={channels}
          filter={filter}
          hidden={hidden}
          tags={tags}
          onChange={setChosen}
        />
        <TabsContent value="week">{view === "week" ? grid : null}</TabsContent>
        <TabsContent value="month">
          {view === "month" ? grid : null}
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface CalendarScreenProps {
  readonly initialDate: CalendarDate | undefined;
  readonly permissions: readonly Permission[];
  readonly workspaceId: string;
}

// The calendar renders in the browser, where the viewer's time zone and the
// current day are known.
export const CalendarScreen = (props: CalendarScreenProps) => {
  const t = useTranslations("Posts.Calendar");
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">{t("loading")}</span>
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <CalendarView {...props} timeZone={browserTimeZone()} />;
};
