import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { SubscriptionCancellation } from "#components/settings/subscription-cancellation.tsx";
import { loadMessages } from "#i18n/messages.ts";
import type { SubscriptionToCancel } from "#settings/errors.ts";

const harbour = "6b1c8d0e-9f7a-4eb5-8a21-7c8d9eafb0c1";
const meadow = "7c2d9e1f-0a8b-4fc6-9b32-8d9eafb0c1d2";

const render = async (
  locale: "en" | "fr",
  subscriptions: readonly SubscriptionToCancel[]
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <SubscriptionCancellation
        agreed={false}
        onAgreedChange={() => {
          // Rendered once: nothing is ticked.
        }}
        subscriptions={subscriptions}
        // The app links through next-intl's Link, which needs Next to run.
        billingLink={(workspaceId) => (
          <a href={`/app/${workspaceId}/billing`}>{`Billing of ${workspaceId}`}</a>
        )}
      />
    </NextIntlClientProvider>
  );
};

const pro: SubscriptionToCancel = {
  paidUntil: Option.some(DateTime.makeUnsafe("2026-12-09T10:00:00Z")),
  plan: Option.some("pro"),
  workspaceId: harbour,
};

describe(SubscriptionCancellation, () => {
  it("lists each subscription it cancels, with its workspace's billing page", async () => {
    const html = await render("en", [
      pro,
      { paidUntil: Option.none(), plan: Option.none(), workspaceId: meadow },
    ]);

    expect(html).toContain("Deleting cancels 2 subscriptions");
    expect(html).toContain(`href="/app/${harbour}/billing"`);
    expect(html).toContain(`href="/app/${meadow}/billing"`);
    expect(html).toContain("Cancel these 2 subscriptions now");
  });

  it("keeps a consumer's right to withdraw within 14 days", async () => {
    const english = await render("en", [pro]);

    expect(english).toContain(
      "The period already paid for, until December 9, 2026, is not refunded, except where the law gives a refund."
    );
    expect(english).toContain(
      "If you subscribed as a consumer less than 14 days ago, you may withdraw and be refunded the unused part"
    );
    expect(english).not.toContain("without a refund of the period paid for<");

    await expect(render("fr", [pro])).resolves.toContain(
      "vous pouvez vous rétracter et être remboursé de la part non utilisée"
    );
  });
});
