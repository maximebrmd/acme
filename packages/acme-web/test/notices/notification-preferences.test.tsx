import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { PreferencesFields } from "#components/notices/notification-preferences-form.tsx";
import { loadMessages } from "#i18n/messages.ts";

const preferences = {
  email: {
    channelReconnect: true,
    postFailed: true,
    postPublished: false,
    postUnconfirmed: true,
  },
  everyPost: false,
};

const render = async (locale: "en" | "fr") => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <PreferencesFields
        preferences={preferences}
        saving={false}
        onChange={() => {
          // Nothing changes while rendering to markup.
        }}
      />
    </NextIntlClientProvider>
  );
};

// Each choice by its label's text, and whether its box is checked. Base UI
// puts the id on the box's native input, which labels name, and names the
// box from them once the page runs.
const choices = (html: string) =>
  new Map(
    [
      ...html.matchAll(
        /<input id="(?<id>[^"]+)"[^>]*type="checkbox"(?<rest>[^>]*)\/>\s*<label for="(?<label>[^"]+)"[^>]*>(?<text>[^<]+)<\/label>/gu
      ),
    ].map(({ groups }) => [
      groups?.["text"],
      {
        checked: (groups?.["rest"] ?? "").includes("checked"),
        labelled: groups?.["id"] === groups?.["label"],
      },
    ])
  );

describe(PreferencesFields, () => {
  it("labels each choice, under a legend, in the reader's language", async () => {
    const english = await render("en");
    const french = await render("fr");

    expect(english).toContain("<legend");
    expect(english).toContain("Email me when");
    expect(french).toContain("M’envoyer un e-mail quand");

    expect(choices(english)).toStrictEqual(
      new Map([
        ["A post did not go out", { checked: true, labelled: true }],
        [
          "A post may have gone out, and needs checking on the platform",
          { checked: true, labelled: true },
        ],
        [
          "A channel must be reconnected, now or soon",
          { checked: true, labelled: true },
        ],
        ["A post went out", { checked: false, labelled: true }],
        [
          "Every post of my workspaces, not only the ones I wrote",
          { checked: false, labelled: true },
        ],
      ])
    );
  });

  it("asks apart whether to hear about other members' posts", async () => {
    const english = await render("en");
    const french = await render("fr");

    expect(english).toContain("Tell me about");
    expect(english).toContain("You always hear about your own posts.");
    expect(french).toContain("Me prévenir pour");
    expect(
      choices(french).get(
        "Toutes les publications de mes espaces de travail, pas seulement les miennes"
      )
    ).toStrictEqual({ checked: false, labelled: true });
  });
});
