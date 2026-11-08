import type { Messages } from "#i18n/messages.ts";
import type { routing } from "#i18n/routing.ts";

// Types next-intl's locales and message keys from the routing and the English
// catalogue.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: Messages;
  }
}
