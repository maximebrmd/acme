import { Context } from "effect";

import type { Locale } from "#shared/domain/locale.ts";

/** Links into the web app, for emails. */
export class AppLinks extends Context.Service<
  AppLinks,
  {
    /**
     * The web app's page at `path` (such as `/app/<workspace>/channels`), in
     * the reader's language.
     */
    readonly url: (path: string, locale: Locale) => string;
  }
>()("peal-server/notifications/application/AppLinks") {}
