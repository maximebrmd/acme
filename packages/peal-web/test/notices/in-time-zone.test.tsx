import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { NoticeEvent } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import { ViewerTimeZone } from "#components/viewer-time-zone.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { useNoticeText } from "#notices/notice-text.ts";

const workspaceId = "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f";

// Late in the evening in UTC, already the next day in Paris.
const lateEvening = DateTime.makeUnsafe("2026-11-09T23:30:00Z");

const Received = () => {
  const t = useTranslations("Notices.page");

  return <p>{t("received", { date: DateTime.toDate(lateEvening) })}</p>;
};

const ReconnectBy = () => {
  const write = useNoticeText(new Map([[workspaceId, "Studio Nord"]]));

  const event: NoticeEvent = {
    _tag: "ChannelReconnectSoon",
    channel: { handle: "@peal_example", platform: "mastodon" },
    expiresAt: lateEvening,
  };

  return <p>{write(event, workspaceId).text}</p>;
};

// As the page renders on a server in UTC, which the client inherits.
const onServerInUtc = async (locale: "en" | "fr", children: ReactNode) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
};

describe(InTimeZone, () => {
  it("writes when a notice arrived in the reader's zone, not the server's", async () => {
    await expect(onServerInUtc("en", <Received />)).resolves.toContain(
      "Nov 9, 2026 at 11:30 PM"
    );
    await expect(
      onServerInUtc(
        "en",
        <InTimeZone timeZone="Europe/Paris">
          <Received />
        </InTimeZone>
      )
    ).resolves.toContain("Nov 10, 2026 at 12:30 AM");
    await expect(
      onServerInUtc(
        "fr",
        <InTimeZone timeZone="Europe/Paris">
          <Received />
        </InTimeZone>
      )
    ).resolves.toContain("10 nov. 2026 à 00:30");
  });

  it("dates the end of a channel's authorization in the reader's zone", async () => {
    await expect(
      onServerInUtc(
        "en",
        <InTimeZone timeZone="Europe/Paris">
          <ReconnectBy />
        </InTimeZone>
      )
    ).resolves.toContain("must be reconnected by November 10, 2026");
  });
});

describe(ViewerTimeZone, () => {
  it("keeps the server's zone until the page has hydrated", async () => {
    // On the server, and in the browser's first render, which must agree.
    await expect(
      onServerInUtc(
        "en",
        <ViewerTimeZone>
          <Received />
        </ViewerTimeZone>
      )
    ).resolves.toContain("Nov 9, 2026 at 11:30 PM");
  });

  it("keeps the zone above when given none", async () => {
    await expect(
      onServerInUtc(
        "fr",
        <InTimeZone timeZone={undefined}>
          <Received />
        </InTimeZone>
      )
    ).resolves.toContain("9 nov. 2026 à 23:30");
  });
});
