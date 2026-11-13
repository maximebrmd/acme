import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { ComposerActions } from "#components/posts/composer-actions.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (locale: Locale, blocked?: string) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
    >
      <ComposerActions
        blocked={blocked}
        busy={null}
        canCancel={false}
        canDiscard={false}
        canReschedule={false}
        canSave
        canSchedule
        canUnschedule={false}
        publishable={blocked === undefined}
        savable={blocked === undefined}
        willWait={false}
        onAction={() => {
          // Rendered once: nothing is asked.
        }}
      />
    </NextIntlClientProvider>
  );

describe(ComposerActions, () => {
  it("says beside the buttons why the post can be neither saved nor scheduled", async () => {
    const html = await render("en", "Why it cannot go yet.");

    expect(html).toContain("Why it cannot go yet.");
    expect(html.match(/disabled=""/gu)?.length).toBe(2);
  });

  it("says nothing when the post can go", async () => {
    await expect(render("en")).resolves.not.toContain("<output");
  });
});
