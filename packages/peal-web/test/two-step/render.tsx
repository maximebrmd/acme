import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { loadMessages } from "#i18n/messages.ts";

/** A view as markup, in `locale`, as the tests read it. */
export const render = async (locale: "en" | "fr", view: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      {view}
    </NextIntlClientProvider>
  );

/** What a view's handlers do while it renders to markup: nothing. */
export const ignore = () => {
  // Nothing happens while rendering to markup.
};
