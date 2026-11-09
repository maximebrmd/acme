import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { NotificationBellView } from "#components/notices/notification-bell-view.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (
  locale: "en" | "fr",
  unread: Option.Option<number>,
  announcement = ""
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <NotificationBellView
        announcement={announcement}
        // The app links through next-intl's Link, which needs Next to run.
        link={<span />}
        unread={unread}
      />
    </NextIntlClientProvider>
  );
};

describe(NotificationBellView, () => {
  it("says how many notices are unread, in its label", async () => {
    await expect(render("en", Option.some(3))).resolves.toContain(
      'aria-label="Notifications, 3 unread"'
    );
    await expect(render("fr", Option.some(1))).resolves.toContain(
      'aria-label="Notifications, 1 non lue"'
    );
    await expect(render("fr", Option.some(2))).resolves.toContain(
      'aria-label="Notifications, 2 non lues"'
    );
  });

  it("shows no count before it knows, nor when all are read", async () => {
    const rendered = await Promise.all(
      [Option.none(), Option.some(0)].map(
        async (unread) => await render("en", unread)
      )
    );

    for (const html of rendered) {
      expect(html).toContain('aria-label="Notifications"');
      expect(html).not.toContain('data-slot="badge"');
    }
  });

  it("caps the badge, which screen readers skip for the label", async () => {
    const html = await render("en", Option.some(120));

    expect(html).toContain(">99+<");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('aria-label="Notifications, 120 unread"');
  });

  it("says when new notices arrive, in a status region", async () => {
    const html = await render("en", Option.some(2), "2 new notifications");

    // An output element is a polite status region.
    expect(html).toMatch(/<output[^>]*>2 new notifications<\/output>/u);
  });
});
