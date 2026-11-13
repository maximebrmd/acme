import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { TextProvider } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { draftOf } from "#assistant/text-provider.ts";
import type {
  TextProviderDraft,
  TextProviderErrorKey,
} from "#assistant/text-provider.ts";
import { TextProviderFormView } from "#components/assistant/text-provider-views.tsx";
import type { TestState } from "#components/assistant/text-provider-views.tsx";
import { loadMessages } from "#i18n/messages.ts";

const saved: TextProvider = {
  baseUrl: "https://text.example.com/v1",
  keySet: true,
  keyUnreadable: false,
  kind: "openai-compatible",
  model: "synthetic-text-model",
  updatedAt: DateTime.makeUnsafe("2026-11-13T09:00:00Z"),
};

const ignore = () => {
  // A view under test changes nothing.
};

const render = async ({
  draft,
  error = null,
  locale = "en",
  provider,
  test = { _tag: "idle" },
}: {
  readonly draft?: TextProviderDraft;
  readonly error?: TextProviderErrorKey | null;
  readonly locale?: "en" | "fr";
  readonly provider: TextProvider | null;
  readonly test?: TestState;
}) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      <TextProviderFormView
        draft={draft ?? draftOf(provider)}
        error={error}
        removing={false}
        saved={provider}
        saving={false}
        test={test}
        testing={false}
        onChange={ignore}
        onRemove={ignore}
        onSave={ignore}
        onTest={ignore}
      />
    </NextIntlClientProvider>
  );

describe(TextProviderFormView, () => {
  it("starts on Anthropic, at its address, and says where drafts go", async () => {
    const html = await render({ provider: null });

    expect(html).toContain('value="https://api.anthropic.com"');
    expect(html).toContain("Anthropic");
    expect(html).toContain("up to 500 a day");
    expect(html).not.toContain(">Test<");
  });

  it("shows a saved key as saved, never its value, and offers a test", async () => {
    const html = await render({ provider: saved });

    expect(html).toContain('value="https://text.example.com/v1"');
    expect(html).toContain("OpenAI-compatible");
    expect(html).toContain("/chat/completions follows");
    expect(html).toContain("A key is saved");
    expect(html).toContain(">Test<");
  });

  it("says how the test ended", async () => {
    await expect(
      render({ provider: saved, test: { _tag: "passed" } })
    ).resolves.toContain("answered with a suggestion the assistant can use");
    await expect(
      render({
        provider: saved,
        test: { _tag: "failed", key: "invalidAnswer" },
      })
    ).resolves.toContain("structured output");
  });

  it("says why a save failed, in French too", async () => {
    const html = await render({
      error: "notPublic",
      locale: "fr",
      provider: null,
    });

    expect(html).toContain("Fournisseur de texte");
    expect(html).toContain("Peal n’y envoie rien");
  });

  it("asks the key again for another address", async () => {
    const html = await render({
      draft: { ...draftOf(saved), baseUrl: "https://text.example.com/v2" },
      provider: saved,
    });

    expect(html).toContain("The address changed");
  });
});
