import { describe, expect, it } from "@effect/vitest";
import {
  AssistantFailed,
  AssistantInputRejected,
  AssistantQuotaExceeded,
  AssistantUnavailable,
} from "peal-contract";
import type { AssistantAction } from "peal-contract";
import { Dialog } from "peal-ui/components/dialog";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { AssistantPreview } from "#components/posts/assistant-preview.tsx";
import type { PreviewState } from "#components/posts/assistant-preview.tsx";
import { loadMessages } from "#i18n/messages.ts";

const ignore = () => {
  // The preview's buttons are not pressed here.
};

const render = async (
  locale: Locale,
  action: AssistantAction,
  state: PreviewState
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <Dialog open>
        <AssistantPreview
          action={action}
          state={state}
          onAccept={ignore}
          onDiscard={ignore}
          onRetry={ignore}
        />
      </Dialog>
    </NextIntlClientProvider>
  );
};

const rewrite: AssistantAction = { _tag: "rewrite", tone: "witty" };

describe(AssistantPreview, () => {
  it("says it is writing while the assistant works", async () => {
    const html = await render("en", rewrite, { _tag: "asking" });

    expect(html).toContain("Rewrite: Witty");
    expect(html).toContain("Writing a suggestion…");
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("Use this text");
  });

  it("shows a suggested text, and how it fits the platform it was cut for", async () => {
    const html = await render(
      "en",
      { _tag: "shorten", platform: "x" },
      { _tag: "ready", suggestion: { _tag: "text", text: "We shipped it." } }
    );

    expect(html).toContain("Shorten for X");
    expect(html).toContain("We shipped it.");
    expect(html).toContain("14 of 280 characters on X");
    expect(html).toContain("Use this text");
    expect(html).toContain("Discard");
  });

  it("shows suggested hashtags, to add", async () => {
    const html = await render(
      "fr",
      { _tag: "hashtags" },
      {
        _tag: "ready",
        suggestion: { _tag: "hashtags", hashtags: ["#printemps", "#soldes"] },
      }
    );

    expect(html).toContain("Hashtags suggérés");
    expect(html).toContain("#printemps");
    expect(html).toContain("Ajouter ces hashtags");
  });

  it("names the language it translates into, in the reader's language", async () => {
    const html = await render(
      "fr",
      { _tag: "translate", language: "de" },
      { _tag: "asking" }
    );

    expect(html).toContain("Traduire en allemand");
  });

  it.each([
    [
      new AssistantQuotaExceeded({
        dailyLimit: 100,
        resetsAt: DateTime.makeUnsafe("2026-11-10T00:00:00Z"),
      }),
      "used its 100 assistant requests for today",
      false,
    ],
    [new AssistantUnavailable(), "not available on this server", false],
    [
      new AssistantInputRejected({ maxLength: 5000, reason: "tooLong" }),
      "longer than the 5,000 characters",
      false,
    ],
    [new AssistantFailed({ reason: "declined" }), "declined to work", false],
    [
      new AssistantFailed({ reason: "unreachable" }),
      "could not be reached",
      true,
    ],
    [
      new AssistantFailed({ reason: "timedOut" }),
      "took too long to answer",
      true,
    ],
    [
      new AssistantFailed({ reason: "invalidAnswer" }),
      "could not be used",
      true,
    ],
  ])(
    "explains a failure as an alert, offering to try again when it may work",
    async (failure, message, retryable) => {
      const html = await render("en", rewrite, { _tag: "failed", failure });

      expect(html).toContain('role="alert"');
      expect(html).toContain(message);
      // The button, not a message that says to try again.
      expect(html.includes(">Try again</button>")).toBe(retryable);
    }
  );

  it("explains a failure in French", async () => {
    const html = await render("fr", rewrite, {
      _tag: "failed",
      failure: new AssistantFailed({ reason: "invalidAnswer" }),
    });

    expect(html).toContain("Réécriture : Spirituel");
    expect(html).toContain("La réponse de l’assistant est inutilisable.");
  });

  it("writes numbers and counts as the reader's language does", async () => {
    const tooLong = await render("fr", rewrite, {
      _tag: "failed",
      failure: new AssistantInputRejected({
        maxLength: 5000,
        reason: "tooLong",
      }),
    });

    const quota = await render("fr", rewrite, {
      _tag: "failed",
      failure: new AssistantQuotaExceeded({
        dailyLimit: 1,
        resetsAt: DateTime.makeUnsafe("2026-11-10T00:00:00Z"),
      }),
    });

    expect(tooLong).toContain(
      `dépasse les ${new Intl.NumberFormat("fr").format(5000)} caractères`
    );
    expect(quota).toContain("a utilisé sa 1 demande à l’assistant");
  });
});
