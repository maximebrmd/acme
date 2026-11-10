import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { SignaturePause } from "#components/posts/signature-pause.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { pausesToCheck, textsChanged } from "#signatures/signing-pause.ts";

const channelId = "00000000-0000-7000-8000-000000000001";

const sent = {
  overrides: [{ channelId, text: "On this channel" }],
  text: "Hello",
};

const savedAs = (text: string, own: string) => ({
  content: { media: [], overrides: [{ channelId, text: own }], text },
});

const signed = savedAs("Hello\n\nThe studio", "On this channel\n\nThe studio");
const unsigned = savedAs("Hello", "On this channel");

describe(textsChanged, () => {
  it("is false when the server saved what was sent", () => {
    expect(textsChanged(sent, unsigned)).toBeFalsy();
  });

  it("sees a signature under the common text or under a channel's own", () => {
    expect(
      textsChanged(sent, savedAs("Hello\n\nThe studio", "On this channel"))
    ).toBeTruthy();
    expect(
      textsChanged(sent, savedAs("Hello", "On this channel\n\nThe studio"))
    ).toBeTruthy();
  });

  it("sees a text of its own a signature gave a channel", () => {
    expect(
      textsChanged({ overrides: [], text: "Hello" }, unsigned)
    ).toBeTruthy();
  });
});

// A part after the first.
const part = (text: string) => ({
  delaySeconds: 0,
  media: [],
  overrides: [],
  text,
});

describe("a thread's texts", () => {
  it("sees a signature the server put under a thread's last part", () => {
    expect(
      textsChanged(
        { ...sent, followUps: [part("Second"), part("Last")] },
        {
          content: {
            ...unsigned.content,
            followUps: [part("Second"), part("Last\n\nThe studio")],
          },
        }
      )
    ).toBeTruthy();
    expect(
      textsChanged(
        { ...sent, followUps: [part("Second")] },
        { content: { ...unsigned.content, followUps: [part("Second")] } }
      )
    ).toBeFalsy();
  });
});

describe(pausesToCheck, () => {
  it("stops a schedule whose save created the post with signatures", () => {
    expect(
      pausesToCheck({ asked: true, created: true, saved: signed, sent })
    ).toBeTruthy();
  });

  it("goes on when the signatures changed nothing", () => {
    expect(
      pausesToCheck({ asked: true, created: true, saved: unsigned, sent })
    ).toBeFalsy();
  });

  it("goes on when the box was unticked", () => {
    expect(
      pausesToCheck({ asked: false, created: true, saved: signed, sent })
    ).toBeFalsy();
  });

  it("goes on for a post that existed: the second Schedule, or a draft", () => {
    expect(
      pausesToCheck({ asked: false, created: false, saved: signed, sent })
    ).toBeFalsy();
    expect(
      pausesToCheck({ asked: true, created: false, saved: signed, sent })
    ).toBeFalsy();
  });
});

const render = async (
  locale: "en" | "fr",
  props: Parameters<typeof SignaturePause>[0]
) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      <SignaturePause {...props} />
    </NextIntlClientProvider>
  );

describe(SignaturePause, () => {
  it("keeps an empty status region on the page until there is news", async () => {
    const html = await render("en", { shown: false, willWait: false });

    expect(html).toContain("<output");
    expect(html).not.toContain("signature");
  });

  it("says nothing is scheduled yet, and names the button to choose again", async () => {
    const [english, french, waiting] = await Promise.all([
      render("en", { shown: true, willWait: false }),
      render("fr", { shown: true, willWait: false }),
      render("en", { shown: true, willWait: true }),
    ]);

    expect(english).toContain(
      "Nothing is scheduled yet: check the text and the character counts, then choose Schedule again."
    );
    expect(french).toContain("puis choisissez de nouveau Programmer.");
    expect(waiting).toContain("then choose Ask for approval again.");
  });
});
