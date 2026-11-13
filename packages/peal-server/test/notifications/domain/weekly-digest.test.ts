import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import {
  digestKeyOf,
  digestWeekOf,
  hasNews,
  renderWeeklyDigest,
} from "#notifications/domain/weekly-digest.ts";
import type {
  DigestEmail,
  LinkedDigestWorkspace,
} from "#notifications/domain/weekly-digest.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const iso = (instant: DateTime.Utc) => DateTime.formatIso(instant);

const workspaceId = WorkspaceIdSchema.make(
  "2f9a3c1e-7d4b-4e8f-9a1c-3b5d7e9f1a2c"
);

const week = digestWeekOf(utc("2026-11-16T06:23:00Z"));

const studio: LinkedDigestWorkspace = {
  calendarUrl: "https://app.example.test/app/2f9a/calendar",
  counts: {
    awaitingApproval: 1,
    failed: 1,
    scheduled: 6,
    unconfirmed: 0,
    wentOut: 7,
  },
  engagement: Option.some({ engagement: 1234, impressions: Option.none() }),
  name: "Studio <Nord> & Co",
  planned: [
    { at: utc("2026-11-17T08:00:00Z"), excerpt: "Launch day <b>soon</b>" },
  ],
  wentOut: [
    { at: utc("2026-11-10T09:30:00Z"), excerpt: "Autumn sale" },
    { at: utc("2026-11-11T09:30:00Z"), excerpt: "" },
  ],
  workspaceId,
};

const email = (locale: Locale, workspaces = [studio]): DigestEmail => ({
  agendaUrl: "https://app.example.test/app/agenda",
  locale,
  preferencesUrl: "https://app.example.test/app/notices/preferences",
  week,
  workspaces,
});

describe(digestWeekOf, () => {
  it("tells the week that ended at the last Monday's midnight UTC, and the week it began", () => {
    expect(iso(week.from)).toBe("2026-11-09T00:00:00.000Z");
    expect(iso(week.to)).toBe("2026-11-16T00:00:00.000Z");
    expect(iso(week.until)).toBe("2026-11-23T00:00:00.000Z");

    // A run late on the Sunday still tells the week before.
    expect(iso(digestWeekOf(utc("2026-11-22T23:59:00Z")).to)).toBe(
      "2026-11-16T00:00:00.000Z"
    );
  });

  it("names a person's digest of a week by ids and a day, never content", () => {
    expect(
      digestKeyOf(
        UserIdSchema.make("6c1d9e0a-2b3f-4a5c-8d7e-9f0a1b2c3d4e"),
        week
      )
    ).toBe("weekly-digest:6c1d9e0a-2b3f-4a5c-8d7e-9f0a1b2c3d4e:2026-11-09");
  });
});

describe(hasNews, () => {
  it("is false for a workspace whose fortnight holds no post", () => {
    expect(hasNews(studio)).toBeTruthy();
    expect(
      hasNews({
        ...studio,
        counts: {
          awaitingApproval: 0,
          failed: 0,
          scheduled: 0,
          unconfirmed: 0,
          wentOut: 0,
        },
      })
    ).toBeFalsy();
  });
});

describe(renderWeeklyDigest, () => {
  it("counts a workspace's week and names its first posts, in UTC", () => {
    const { subject, text } = renderWeeklyDigest(email("en"));

    expect(subject).toBe(
      "Your week on Peal: November 9, 2026 to November 15, 2026"
    );
    expect(
      [
        "What went out from November 9, 2026 to November 15, 2026, and what is planned until November 22, 2026",
        "7 posts went out · 1 failed · 6 scheduled this week · 1 waiting for approval",
        "- November 10, 2026 at 9:30 AM UTC: Autumn sale",
        "- November 11, 2026 at 9:30 AM UTC: No text",
        "- and 5 more",
        "Engagement with the week’s posts, as last counted: 1,234.",
        "Open the calendar of Studio <Nord> & Co: https://app.example.test/app/2f9a/calendar",
        "turn it off in your notification preferences (https://app.example.test/app/notices/preferences).",
      ].filter((expected) => !text.includes(expected))
    ).toStrictEqual([]);
    expect(text).not.toContain("Impressions");
  });

  it("escapes what members wrote in its HTML, and links how to stop it", () => {
    const { html } = renderWeeklyDigest(email("en"));

    expect(html).toContain("Studio &lt;Nord&gt; &amp; Co");
    expect(html).toContain("Launch day &lt;b&gt;soon&lt;/b&gt;");
    expect(html).not.toContain("<b>soon</b>");
    expect(html).toContain(
      '<a href="https://app.example.test/app/notices/preferences" style="color:#52525b;">your notification preferences</a>'
    );
    expect(html).toContain('href="https://app.example.test/app/agenda"');
  });

  it("is written in French, with French plurals", () => {
    const { subject, text } = renderWeeklyDigest(
      email("fr", [
        {
          ...studio,
          counts: { ...studio.counts, failed: 0, unconfirmed: 2, wentOut: 1 },
          engagement: Option.some({
            engagement: 1234,
            impressions: Option.some(56_789),
          }),
          wentOut: [studio.wentOut[0] ?? studio.planned[0]].flatMap((post) =>
            post === undefined ? [] : [post]
          ),
        },
      ])
    );

    expect(subject).toBe(
      "Votre semaine sur Peal : du 9 novembre 2026 au 15 novembre 2026"
    );
    expect(text).toContain(
      "1 publication partie · 2 à vérifier sur leurs plateformes · 6 programmées cette semaine · 1 en attente d’approbation"
    );
    expect(text).toContain("Impressions : 56 789.");
    expect(text).toContain(
      "désactivez-le dans vos préférences de notification"
    );
  });
});
