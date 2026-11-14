import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { constVoid } from "effect/Function";
import { NextIntlClientProvider } from "next-intl";
import type {
  Channel,
  InboxConversation,
  InboxDirectMessage,
} from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ConversationRowView,
  DirectMessageView,
  MessageBoxView,
} from "#components/inbox/message-views.tsx";
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

const at = (iso: string) => DateTime.makeUnsafe(iso);

const link = (href: string, label: string) => <a href={href}>{label}</a>;

const workspaceId = "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f";

const channel: Channel = {
  avatarUrl: null,
  connection: null,
  displayName: "Synthetic studio",
  handle: "@studio@social.example",
  id: "00000000-0000-7000-8000-0000000000c3",
  label: null,
  platform: "mastodon",
  status: { _tag: "active" },
  tokenExpiresAt: null,
};

const conversation: InboxConversation = {
  channelId: channel.id,
  id: "00000000-0000-7000-8000-0000000000f1",
  lastIncomingAt: at("2026-11-14T09:00:00Z"),
  lastMessageAt: at("2026-11-14T09:00:00Z"),
  messages: 2,
  participants: [
    {
      displayName: "A synthetic reader",
      handle: "reader@social.example",
      platformId: "7001",
    },
  ],
  readAt: null,
  request: false,
  unread: true,
};

const message: InboxDirectMessage = {
  attachments: 1,
  conversationId: conversation.id,
  fromAccount: false,
  id: "00000000-0000-7000-8000-0000000000f2",
  senderPlatformId: "7001",
  sentAt: at("2026-11-14T09:00:00Z"),
  text: "<b>Open</b> today?",
};

describe("the direct messages' views", () => {
  it("show a conversation's row, unread, in both languages", async () => {
    const view = (
      <ConversationRowView
        channel={channel}
        conversation={conversation}
        link={link}
        workspaceId={workspaceId}
      />
    );

    const english = await render("en", view);
    const french = await render("fr", view);

    expect(english).toContain(
      `href="/app/${workspaceId}/inbox/messages/${conversation.id}"`
    );
    expect(english).toContain("With A synthetic reader");
    expect(english).toContain("Unread");
    expect(english).toContain("2 messages");
    expect(french).toContain("Avec A synthetic reader");
    expect(french).toContain("Non lue");
  });

  it("show what someone wrote as text, never as markup, without the files", async () => {
    const html = await render(
      "en",
      <DirectMessageView conversation={conversation} message={message} />
    );

    expect(html).toContain("&lt;b&gt;Open&lt;/b&gt; today?");
    expect(html).not.toContain("<b>Open</b>");
    expect(html).toContain("A synthetic reader");
    expect(html).toContain("1 file, not shown");
  });

  it("say a message is private, and keep the box shut while one is on its way", async () => {
    const html = await render(
      "fr",
      <MessageBoxView
        error={null}
        maximum={5000}
        pending
        sending={false}
        text="Bonjour"
        onChange={constVoid}
        onSend={constVoid}
      />
    );

    expect(html).toContain("ne peut pas être repris");
    expect(html).toMatch(/7 sur 5\s000 caractères/u);
    expect(html).toContain("disabled");
  });
});
