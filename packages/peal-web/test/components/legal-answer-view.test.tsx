import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { LegalAnswer } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { LegalAnswerView } from "#components/staff/legal-answer-view.tsx";
import { loadMessages } from "#i18n/messages.ts";

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const render = async (answer: LegalAnswer, locale: "en" | "fr" = "en") => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <LegalAnswerView answer={answer} />
    </NextIntlClientProvider>
  );
};

const answer: LegalAnswer = {
  at: utc("2026-11-10T09:30:00Z"),
  connections: [
    {
      access: "session",
      apiKeyId: null,
      at: utc("2026-10-02T08:15:00Z"),
      ipAddress: "203.0.113.7",
      protocol: "https",
      userId: "5b1f0d6e-2f6b-4c57-9c06-3b7e7d0f2a11",
      workspaceId: "0c8f6b1e-52f1-4d0a-a0a5-6d1f7f1c9b22",
    },
  ],
  held: [
    {
      closedAt: utc("2026-10-05T12:00:00Z"),
      identity: {
        accountCreatedAt: utc("2025-01-10T09:00:00Z"),
        email: "ana@example.test",
        name: "Ana Synthetic",
      },
      signInMethods: null,
      stripeCustomerIds: null,
      userId: "5b1f0d6e-2f6b-4c57-9c06-3b7e7d0f2a11",
    },
  ],
  id: "019a6f10-0000-7000-8000-000000000001",
};

describe(LegalAnswerView, () => {
  it("shows what the request covered, and the record of the answer", async () => {
    const html = await render(answer);

    expect(html).toContain("019a6f10-0000-7000-8000-000000000001");
    expect(html).toContain("ana@example.test");
    expect(html).toContain("Ana Synthetic");
    expect(html).toContain("203.0.113.7");
  });

  it("says what the request did not cover, and shows none of it", async () => {
    const html = await render(answer);

    // How the account signed in, and how it paid.
    expect(html.split("Not covered by this request")).toHaveLength(3);

    const withoutConnections = await render({ ...answer, connections: null });

    expect(withoutConnections).not.toContain("203.0.113.7");
    expect(
      withoutConnections.split("Not covered by this request")
    ).toHaveLength(4);
  });

  it("says when nothing is held, in the reader's language", async () => {
    const empty = { ...answer, connections: [], held: [] };

    await expect(render(empty)).resolves.toContain(
      "No closed account is held for this subject."
    );
    await expect(render(empty)).resolves.toContain(
      "No connection is held for this subject in this period."
    );
    await expect(render(empty, "fr")).resolves.toContain(
      "Aucun compte fermé n’est conservé pour ce sujet."
    );
  });
});
