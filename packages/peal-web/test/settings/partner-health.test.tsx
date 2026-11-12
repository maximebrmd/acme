import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { CustomerHealth } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CustomerHealthLine } from "#components/settings/partner-health.tsx";
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

const health = (
  toReconnect: number,
  failedLast7Days: number
): CustomerHealth => ({
  channels: { connected: 3, off: 0, toReconnect },
  externalId: "synthetic-customer",
  id: "8e3f9a97-8a3c-4dab-8d85-6c4f5a7b8293",
  inbox: { unanswered: 0 },
  name: "Synthetic customer",
  posts: {
    awaitingApproval: 0,
    failedLast7Days,
    mayApprove: true,
    scheduledNext7Days: 0,
    unconfirmedLast7Days: 0,
  },
});

describe("a customer's health in the partner settings", () => {
  it("shows the channels to reconnect and the posts that failed, in both languages", async () => {
    const english = await render(
      "en",
      <CustomerHealthLine health={health(2, 1)} />
    );

    const french = await render(
      "fr",
      <CustomerHealthLine health={health(2, 1)} />
    );

    expect(english).toContain("To reconnect: 2");
    expect(english).toContain("Failed, 7 days: 1");
    expect(french).toContain("À reconnecter : 2");
    expect(french).toContain("En échec, 7 jours : 1");
  });

  it("shows zeros as zeros, and nothing while the figures are not read", async () => {
    await expect(
      render("en", <CustomerHealthLine health={health(0, 0)} />)
    ).resolves.toContain("To reconnect: 0");
    await expect(
      render("en", <CustomerHealthLine health={undefined} />)
    ).resolves.toBe("");
  });
});
