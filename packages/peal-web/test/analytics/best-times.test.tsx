import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { BestTimes } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BestTimesView } from "#components/analytics/best-times-view.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (locale: "en" | "fr", view: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      {view}
    </NextIntlClientProvider>
  );

const found: BestTimes = {
  best: [{ hour: 9, median: 13, posts: 4, weekday: "tuesday" }],
  buckets: [
    { hour: 9, median: 13, posts: 4, weekday: "tuesday" },
    { hour: 18, median: null, posts: 2, weekday: "friday" },
  ],
  channelId: "0190f3a0-0000-7000-8000-00000000c001",
  counted: true,
  days: 90,
  enough: true,
  from: "2026-08-12",
  minimumPosts: 20,
  minimumPostsPerHour: 3,
  platform: "mastodon",
  posts: 24,
  recent: 1,
  timeZone: "Europe/Paris",
  to: "2026-11-09",
};

describe(BestTimesView, () => {
  it("marks the best hours, and gives the same figures as a table", async () => {
    const html = await render("en", <BestTimesView found={found} />);

    expect(html).toMatch(/Best hours.*Tuesday at 9:00/u);
    expect(html).toContain('data-best="true"');
    expect(html).toMatch(/Friday at 18:00<\/th><td[^>]*>2<\/td><td[^>]*>–/u);
    expect(html).toContain("1 post less than 48 hours old is left out");
  });

  it("ranks nothing under the floor, and says so", async () => {
    const html = await render(
      "en",
      <BestTimesView found={{ ...found, best: [], enough: false, posts: 7 }} />
    );

    expect(html).toContain(
      "7 posts in the range: 20 are needed to rank its hours."
    );
    expect(html).not.toContain("Best hours");
  });

  it("says a platform gives nothing to weigh, in French too", async () => {
    const html = await render(
      "fr",
      <BestTimesView
        found={{
          ...found,
          buckets: [],
          counted: false,
          platform: "googleBusiness",
        }}
      />
    );

    expect(html).toContain("Google Business Profile ne donne ni j’aime");
  });
});
