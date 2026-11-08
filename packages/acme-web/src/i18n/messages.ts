import type { Locale } from "next-intl";

import type english from "#messages/en.json";

// English is the reference catalogue: its shape types every message key.
export type Messages = typeof english;

// One catalogue per locale. The record type makes a missing locale, or a
// catalogue that lacks an English key, a type error.
const catalogues: Record<Locale, () => Promise<Messages>> = {
  en: async () => {
    const { default: messages } = await import("#messages/en.json");

    return messages;
  },
  fr: async () => {
    const { default: messages } = await import("#messages/fr.json");

    return messages;
  },
};

export const loadMessages = async (locale: Locale): Promise<Messages> =>
  await catalogues[locale]();
