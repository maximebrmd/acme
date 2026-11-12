import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { ImageProvider } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { draftOf } from "#assistant/image-provider.ts";
import type {
  ImageProviderDraft,
  ImageProviderErrorKey,
} from "#assistant/image-provider.ts";
import { ImageProviderFormView } from "#components/assistant/image-provider-views.tsx";
import { loadMessages } from "#i18n/messages.ts";

const saved: ImageProvider = {
  baseUrl: "https://images.example.com/v1",
  keySet: true,
  keyUnreadable: false,
  model: "synthetic-image-model",
  updatedAt: DateTime.makeUnsafe("2026-11-12T09:00:00Z"),
};

const ignore = () => {
  // A view under test changes nothing.
};

const render = async ({
  draft,
  error = null,
  locale = "en",
  provider,
}: {
  readonly draft?: ImageProviderDraft;
  readonly error?: ImageProviderErrorKey | null;
  readonly locale?: "en" | "fr";
  readonly provider: ImageProvider | null;
}) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      <ImageProviderFormView
        draft={draft ?? draftOf(provider)}
        error={error}
        removing={false}
        saved={provider}
        saving={false}
        onChange={ignore}
        onRemove={ignore}
        onSave={ignore}
      />
    </NextIntlClientProvider>
  );

describe(ImageProviderFormView, () => {
  it("says what the provider receives, before the button", async () => {
    const html = await render({ provider: null });

    expect(html).toContain(
      "This workspace&#x27;s image descriptions go to this address, with this key. Its images do not count against the plan&#x27;s assistant requests, and still take room in the plan&#x27;s storage. Peal keeps the key encrypted and never shows it again."
    );
    expect(html).toContain("Your workspace has no image provider of its own.");
    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="off"');
    // Nothing to remove.
    expect(html).not.toContain("Remove");
  });

  it("shows a saved key as saved, never its value, and offers to remove it", async () => {
    const html = await render({ provider: saved });

    expect(html).toContain('placeholder="Saved"');
    expect(html).toContain(
      "A key is saved: leave this empty to keep it. Peal never shows it again."
    );
    expect(html).toContain('value="https://images.example.com/v1"');
    expect(html).toContain("Remove");
    expect(html).toContain("Saved Nov 12, 2026");
  });

  it("asks for the key again when it can no longer be read", async () => {
    const html = await render({ provider: { ...saved, keyUnreadable: true } });

    expect(html).toContain(
      "The saved key can no longer be read. Type the key again."
    );
    expect(html).not.toContain('placeholder="Saved"');
  });

  it("asks for the key again when the address moves to another host", async () => {
    const html = await render({
      draft: {
        ...draftOf(saved),
        baseUrl: "https://other-images.example.com/v1",
      },
      provider: saved,
    });

    expect(html).toContain(
      "The address is on another host: type the key again"
    );
  });

  it("says why a save was refused, in French too", async () => {
    await expect(
      render({ error: "notPublic", provider: null })
    ).resolves.toContain(
      "The address&#x27;s host is not on the public internet: Peal sends nothing there."
    );
    await expect(
      render({ error: "keyRequired", locale: "fr", provider: null })
    ).resolves.toContain(
      "Saisissez la clé : aucune n’est enregistrée pour cette adresse."
    );
  });
});
