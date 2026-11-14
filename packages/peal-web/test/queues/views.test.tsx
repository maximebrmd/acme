import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { SocialChannel, Queue } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { QueueChoiceView } from "#components/posts/queue-choice.tsx";
import { QueueReshuffleView } from "#components/queues/queue-reshuffle-view.tsx";
import {
  QueueFieldsView,
  QueueItemView,
  UpcomingSlotsView,
} from "#components/queues/queue-views.tsx";
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

const missingFrom = (html: string, expected: readonly string[]) =>
  expected.filter((text) => !html.includes(text));

const noop = () => {
  // Nothing changes while rendering to markup.
};

const channel: SocialChannel = {
  avatarUrl: null,
  connection: null,
  displayName: null,
  handle: "@peal_a",
  id: "a",
  label: null,
  platform: "mastodon",
  status: { _tag: "active" },
  tokenExpiresAt: null,
};

const queue = (fields: Partial<Queue>): Queue => ({
  channelIds: ["a"],
  channelSetId: null,
  createdAt: DateTime.makeUnsafe("2026-11-01T09:00:00Z"),
  id: "q1",
  isDefault: true,
  name: "Weekdays",
  slots: [
    { day: "tuesday", time: "17:30" },
    { day: "monday", time: "09:00" },
  ],
  timeZone: "Europe/Paris",
  unavailableChannelIds: [],
  ...fields,
});

const at = (iso: string) => DateTime.makeUnsafe(iso);

describe(QueueItemView, () => {
  it("shows a queue's week in order, its zone, its channels and that it is the default", async () => {
    const html = await render(
      "en",
      <QueueItemView channels={[channel]} queue={queue({})} upcoming={null} />
    );

    expect(
      missingFrom(html, [
        "Weekdays",
        "Default",
        "Monday, 9:00 AM · Tuesday, 5:30 PM, in Europe/Paris",
        "@peal_a",
      ])
    ).toStrictEqual([]);
  });

  it("says, in French, how many of its channels are gone", async () => {
    const html = await render(
      "fr",
      <QueueItemView
        channels={[]}
        queue={queue({ unavailableChannelIds: ["a"] })}
        upcoming={null}
      />
    );

    expect(html).toContain("1 canal de cette file n’est plus connecté");
    expect(html).toContain("lundi");
  });
});

describe(UpcomingSlotsView, () => {
  it("lists the coming slots on the queue's clock, free or taken, and the next free one", async () => {
    const html = await render(
      "en",
      <UpcomingSlotsView
        timeZone="Europe/Paris"
        upcoming={{
          _tag: "loaded",
          preview: {
            nextFree: at("2026-11-17T16:30:00Z"),
            noRoom: null,
            slots: [
              { at: at("2026-11-16T08:00:00Z"), postId: "p1" },
              { at: at("2026-11-17T16:30:00Z"), postId: null },
            ],
          },
        }}
      />
    );

    expect(
      missingFrom(html, [
        "Next slots, in Europe/Paris:",
        "Nov 16, 2026, 9:00 AM: taken",
        "Nov 17, 2026, 5:30 PM: free",
        "Next free slot: Nov 17, 2026, 5:30 PM.",
      ])
    ).toStrictEqual([]);
  });

  it("says why a queue has no room, and when it is still reading", async () => {
    const empty = await render(
      "en",
      <UpcomingSlotsView
        timeZone="UTC"
        upcoming={{
          _tag: "loaded",
          preview: { nextFree: null, noRoom: "noSlots", slots: [] },
        }}
      />
    );

    expect(empty).toContain("No free slot: the queue has no slot.");

    await expect(
      render(
        "fr",
        <UpcomingSlotsView timeZone="UTC" upcoming={{ _tag: "loading" }} />
      )
    ).resolves.toContain("Lecture des prochains créneaux");
  });
});

describe(QueueFieldsView, () => {
  it("offers a queue's name, zone, slots, channels and default", async () => {
    const html = await render(
      "en",
      <QueueFieldsView
        channelSets={[]}
        channels={[channel]}
        disabled={false}
        draft={{
          channelIds: ["a"],
          channelSetId: "",
          isDefault: false,
          name: "Weekdays",
          slots: [{ day: "friday", time: "08:15" }],
          timeZone: "Europe/Paris",
        }}
        dropped={0}
        error={{ key: "nameTaken" }}
        idPrefix="new"
        zones={["Europe/Paris", "UTC"]}
        onChange={noop}
      />
    );

    expect(
      missingFrom(html, [
        "The workspace already has a queue of this name.",
        "Time zone",
        "Friday, 8:15 AM",
        "Remove the slot Friday, 8:15 AM",
        "Add the slot",
        "Default queue",
      ])
    ).toStrictEqual([]);
  });
});

describe(QueueChoiceView, () => {
  const link = <span>Set up queues</span>;

  it("links to the settings when the workspace has no queue", async () => {
    const html = await render(
      "en",
      <QueueChoiceView
        disabled={false}
        settingsLink={link}
        state={{ _tag: "none" }}
        onChange={noop}
      />
    );

    expect(html).toContain("This workspace has no queue yet.");
    expect(html).toContain("Set up queues");
  });

  it("says it is reading, or could not read, the queues", async () => {
    await expect(
      render(
        "en",
        <QueueChoiceView
          disabled={false}
          settingsLink={link}
          state={{ _tag: "loading" }}
          onChange={noop}
        />
      )
    ).resolves.toContain("Reading the queues");
    await expect(
      render(
        "fr",
        <QueueChoiceView
          disabled={false}
          settingsLink={link}
          state={{ _tag: "failed" }}
          onChange={noop}
        />
      )
    ).resolves.toContain("Les files d’attente n’ont pas pu être lues.");
  });

  it("preselects the default queue and says where a post added now goes", async () => {
    const html = await render(
      "en",
      <QueueChoiceView
        disabled={false}
        settingsLink={link}
        state={{
          _tag: "ready",
          next: Option.some({
            nextFree: at("2026-11-16T08:00:00Z"),
            noRoom: null,
            slots: [],
          }),
          queueId: "q1",
          queues: [queue({})],
        }}
        onChange={noop}
      />
    );

    expect(
      missingFrom(html, [
        "Weekdays (default)",
        "Next free slot: Monday, November 16, 2026 at 9:00 AM (Europe/Paris)",
      ])
    ).toStrictEqual([]);
  });

  it("says a full queue has no slot to give", async () => {
    const html = await render(
      "fr",
      <QueueChoiceView
        disabled={false}
        settingsLink={link}
        state={{
          _tag: "ready",
          next: Option.some({ nextFree: null, noRoom: "full", slots: [] }),
          queueId: "q1",
          queues: [queue({ isDefault: false })],
        }}
        onChange={noop}
      />
    );

    expect(html).toContain(
      "Tous les créneaux des 366 prochains jours sont pris."
    );
  });
});

describe(QueueReshuffleView, () => {
  it("offers to move the waiting posts, and says what moved and why it stopped, in both languages", async () => {
    const offered = await render(
      "en",
      <QueueReshuffleView
        action={<button type="button">Move</button>}
        count={3}
        more={false}
        state={{ _tag: "offered" }}
      />
    );

    expect(offered).toContain(
      "3 posts wait in this queue at the times they had."
    );

    const done = {
      _tag: "done",
      result: { moved: 12, remaining: 2, stoppedBy: "planLimit", unchanged: 1 },
    } as const;

    expect(
      missingFrom(
        await render(
          "en",
          <QueueReshuffleView action={null} count={100} more state={done} />
        ),
        [
          "More than 100 posts wait in this queue",
          "12 posts moved, 1 unchanged, 2 remaining.",
          "It stopped at a month the plan has no room in.",
        ]
      )
    ).toStrictEqual([]);
    expect(
      missingFrom(
        await render(
          "fr",
          <QueueReshuffleView
            action={null}
            count={1}
            more={false}
            state={done}
          />
        ),
        [
          "1 publication attend dans cette file",
          "12 publications déplacées, 1 inchangée, 2 restantes.",
        ]
      )
    ).toStrictEqual([]);
  });
});
