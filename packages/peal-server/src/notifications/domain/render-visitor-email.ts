import type { Locale } from "#shared/domain/locale.ts";

import { catalogs, escapeHtml, linklessLayout } from "./email-layout.ts";
import type { RenderedEmail } from "./email-layout.ts";

/**
 * The email that tells a visitor of a review link that someone answered
 * their comment, in the language they read the page in. It says nothing of
 * the post or the answer, and holds no link: the link's token is not kept.
 */
export const renderReviewReply = (locale: Locale): RenderedEmail => {
  const catalog = catalogs[locale];
  const { body, ignore, subject } = catalog.reviewReply;

  return {
    html: linklessLayout({
      body: escapeHtml(body),
      ignore: escapeHtml(ignore),
      locale,
      signature: escapeHtml(catalog.layout.signature),
    }),
    subject,
    text: [body, ignore, catalog.layout.signature].join("\n\n"),
  };
};
