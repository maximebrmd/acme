import { defineRouting } from "next-intl/routing";

// English is the default and needs no prefix (/), French lives under /fr.
export const routing = defineRouting({
  defaultLocale: "en",
  localePrefix: "as-needed",
  locales: ["en", "fr"],
});
