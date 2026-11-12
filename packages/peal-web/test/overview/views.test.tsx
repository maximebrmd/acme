import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { AgendaItem, WorkspaceOverview } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  agendaDays,
  AgendaDaysView,
  WorkspaceAttentionView,
} from "#components/overview/overview-views.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (locale: "en" | "fr", view: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="Europe/Paris"
    >
      {view}
    </NextIntlClientProvider>
  );

const link = (href: string, label: string) => <a href={href}>{label}</a>;

const workspace: WorkspaceOverview = {
  channels: { connected: 2, off: 0, toReconnect: 1 },
  id: "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e31",
  inbox: { unanswered: 0 },
  name: "Studio",
  overPlan: false,
  posts: {
    awaitingApproval: 2,
    failedLast7Days: 1,
    mayApprove: true,
    scheduledNext7Days: 3,
    unconfirmedLast7Days: 0,
  },
  refused: null,
  role: "admin",
  slug: "studio",
};

const nothing: WorkspaceOverview = {
  ...workspace,
  channels: { connected: 2, off: 0, toReconnect: 0 },
  posts: {
    awaitingApproval: 0,
    failedLast7Days: 0,
    mayApprove: true,
    scheduledNext7Days: 0,
    unconfirmedLast7Days: 0,
  },
};

describe(WorkspaceAttentionView, () => {
  it("links each thing that needs attention to the page that shows it", async () => {
    const html = await render(
      "en",
      <WorkspaceAttentionView linkTo={link} workspace={workspace} />
    );

    expect(html).toContain(
      `<a href="/app/${workspace.id}/posts?status=finished&amp;outcome=failed">1 post failed on a channel in the last 7 days</a>`
    );
    expect(html).toContain(
      `<a href="/app/${workspace.id}/approvals">2 posts wait for your approval</a>`
    );
    expect(html).toContain(
      `<a href="/app/${workspace.id}/channels">1 channel to reconnect</a>`
    );
    expect(html).toContain("3 posts go out in the next 7 days");
    expect(html).not.toMatch(/\/inbox|Nothing needs attention/u);
  });

  it("says once that nothing needs attention, never a row of zeros", async () => {
    const html = await render(
      "en",
      <WorkspaceAttentionView linkTo={link} workspace={nothing} />
    );

    expect(html).toContain("Nothing needs attention.");
    expect(html).toContain("Nothing goes out in the next 7 days");
    expect(html).not.toContain("<a ");
  });

  it("shows nothing of a workspace that refuses the person", async () => {
    const html = await render(
      "en",
      <WorkspaceAttentionView
        linkTo={link}
        workspace={{
          ...workspace,
          channels: null,
          inbox: null,
          overPlan: null,
          posts: null,
          refused: "twoStepRequired",
        }}
      />
    );

    expect(html).toBe("");
  });

  it("leaves out a section the role may not read, rather than count it as none", async () => {
    const html = await render(
      "en",
      <WorkspaceAttentionView
        linkTo={link}
        workspace={{ ...workspace, inbox: null, posts: null }}
      />
    );

    expect(html).toContain("1 channel to reconnect");
    expect(html).not.toContain("go out in the next 7 days");
    expect(html).not.toContain("approval");
  });

  it("speaks French", async () => {
    const html = await render(
      "fr",
      <WorkspaceAttentionView linkTo={link} workspace={nothing} />
    );

    expect(html).toContain("Rien ne demande votre attention.");
  });
});

const item = (
  postId: string,
  iso: string,
  extra: Partial<AgendaItem> = {}
): AgendaItem => ({
  excerpt: "A synthetic post",
  platforms: ["mastodon", "bluesky"],
  postId,
  scheduledAt: DateTime.makeUnsafe(iso),
  status: "scheduled",
  timeZone: "Europe/Paris",
  workspaceId: workspace.id,
  ...extra,
});

describe(agendaDays, () => {
  it("groups the posts by day as given, keeping their order", () => {
    const items = [
      item("0190f3a0-0000-7000-8000-000000000001", "2026-11-13T22:30:00Z"),
      item("0190f3a0-0000-7000-8000-000000000002", "2026-11-13T23:30:00Z"),
      item("0190f3a0-0000-7000-8000-000000000003", "2026-11-15T09:00:00Z"),
    ];

    // In Paris the second post goes out on the 14th.
    const days = agendaDays(items, ({ scheduledAt }) =>
      DateTime.formatIsoDate(
        DateTime.makeZonedUnsafe(scheduledAt, { timeZone: "Europe/Paris" })
      )
    );

    expect(
      days.map(({ day, items: listed }) => [day, listed.length])
    ).toStrictEqual([
      ["2026-11-13", 1],
      ["2026-11-14", 1],
      ["2026-11-15", 1],
    ]);
  });
});

describe(AgendaDaysView, () => {
  it("shows each post's time, workspace, platforms and text, linked to the post", async () => {
    const listed = item(
      "0190f3a0-0000-7000-8000-000000000001",
      "2026-11-13T08:00:00Z",
      {
        excerpt: "مرحبا synthetic",
        platforms: null,
        status: "awaitingApproval",
      }
    );

    const html = await render(
      "en",
      <AgendaDaysView
        days={[{ day: "Friday, November 13, 2026", items: [listed] }]}
        linkTo={link}
        workspaceNames={new Map([[workspace.id, "Studio"]])}
      />
    );

    expect(html).toMatch(
      /Friday, November 13, 2026.*Studio.*Waiting for approval/u
    );
    expect(html).toContain('dir="auto"');
    expect(html).toContain(
      `<a href="/app/${workspace.id}/posts/${listed.postId}">مرحبا synthetic</a>`
    );
    expect(html).not.toContain("mastodon");
  });
});
