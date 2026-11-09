import { RegistryProvider } from "@effect/atom-react";
import { describe, expect, it } from "@effect/vitest";
import { MediaContentTypeSchema } from "acme-contract";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { MediaUploader } from "#components/media/media-uploader.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { routing } from "#i18n/routing.ts";

const render = async (locale: (typeof routing.locales)[number]) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <RegistryProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <MediaUploader workspaceId="00000000-0000-4000-8000-000000000001" />
      </NextIntlClientProvider>
    </RegistryProvider>
  );
};

describe(MediaUploader, () => {
  it("offers every type the API takes, several files at once", async () => {
    const html = await render("en");
    const accept = MediaContentTypeSchema.literals.join(",");

    expect(html).toContain(`accept="${accept}"`);
    expect(html).toMatch(/<input[^>]*type="file"[^>]*multiple/u);
  });

  it.each(routing.locales)("names the picker in %s", async (locale) => {
    const messages = await loadMessages(locale);

    await expect(render(locale)).resolves.toContain(
      `aria-label="${messages.Media.uploader.choose}"`
    );
  });
});
