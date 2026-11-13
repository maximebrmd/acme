import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { CalendarDayView } from "#components/posts/calendar-day-view.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { dayRows, queueSlotsOn } from "#posts/day-rows.ts";
import type { CalendarDate } from "#posts/zoned-time.ts";

const utc = (iso: string) => DateTime.makeUnsafe(iso);

// 29 March 2026 in Paris: the clocks jump from 02:00 to 03:00.
const springForward: CalendarDate = { day: 29, month: 3, year: 2026 };

const queues = [
  {
    id: "q1",
    name: "Mornings",
    // 02:30 does not exist that day: the slot is at 03:00.
    slots: [
      { day: "sunday", time: "02:30" },
      { day: "sunday", time: "09:00" },
    ] as const,
    timeZone: "Europe/Paris",
  },
];

const placed = [
  {
    at: utc("2026-03-29T07:00:00Z"),
    post: { id: "p-queued", queueId: "q1", text: "Queued at nine" },
  },
  {
    at: utc("2026-03-29T00:30:00Z"),
    post: { id: "p-early", queueId: null, text: "Before the jump" },
  },
];

const render = async (
  locale: Locale,
  date: CalendarDate,
  rows: Parameters<typeof dayRows<(typeof placed)[number]>>
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <CalendarDayView
        date={date}
        dayStart={<a href="#start-day">start</a>}
        renderPost={({ post }) => <span data-post={post.id}>{post.text}</span>}
        renderStart={(at) => (
          <a data-start={DateTime.formatIso(at)} href="#start">
            start
          </a>
        )}
        rows={dayRows(...rows)}
        timeZone="Europe/Paris"
      />
    </NextIntlClientProvider>
  );
};

const times = (html: string) =>
  [
    ...html.matchAll(/<time dateTime="(?<at>[^"]+)"[^>]*>(?<shown>[^<]+)</gu),
  ].map(({ groups }) => [groups?.["at"], groups?.["shown"]]);

describe(CalendarDayView, () => {
  it("lists a daylight saving day's posts and free slots by time, with their offsets", async () => {
    const slots = queueSlotsOn(queues, springForward, "Europe/Paris");
    const html = await render("en", springForward, [placed, slots]);

    // Before the jump on UTC+1, after it on UTC+2; the slot of 02:30 is
    // free at 03:00, and the one at 09:00 is held by its queue's post.
    expect(times(html)).toStrictEqual([
      ["2026-03-29T00:30:00.000Z", "1:30 AM GMT+1"],
      ["2026-03-29T01:00:00.000Z", "3:00 AM GMT+2"],
      ["2026-03-29T07:00:00.000Z", "9:00 AM GMT+2"],
    ]);

    expect(html).toContain("Free slot of Mornings");
    expect(html).toContain('data-start="2026-03-29T01:00:00.000Z"');
    expect(html.match(/Free slot of/gu)).toHaveLength(1);
    expect(html.indexOf('data-post="p-early"')).toBeLessThan(
      html.indexOf('data-post="p-queued"')
    );
  });

  it("writes an ordinary day's times without their offset, in French too", async () => {
    const monday: CalendarDate = { day: 30, month: 3, year: 2026 };

    const html = await render("fr", monday, [
      [
        {
          at: utc("2026-03-30T07:00:00Z"),
          post: { id: "p1", queueId: null, text: "Lundi" },
        },
      ],
      [],
    ]);

    expect(times(html)).toStrictEqual([["2026-03-30T07:00:00.000Z", "09:00"]]);
    expect(html).toContain("Les publications et créneaux de file du jour");
  });

  it("says when a day holds nothing", async () => {
    const html = await render("en", springForward, [[], []]);

    expect(html).toContain("Nothing on this day");
    expect(html).toContain('href="#start-day"');
    expect(html).not.toContain("<ol");
  });
});
