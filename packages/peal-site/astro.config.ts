import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import type { AstroUserConfig } from "astro";
import { defineConfig, envField } from "astro/config";

import { defaultLocale, locales } from "./src/i18n/locales.ts";

// Optional settings read at build time. src/config.ts treats an empty value
// as unset, so a CI variable that is declared but blank turns the feature off.
const optional = envField.string({
  access: "public",
  context: "server",
  optional: true,
});

const config: AstroUserConfig = {
  env: {
    schema: {
      // The docs site's origin, such as https://docs.example.com: adds links
      // to it.
      SITE_DOCS_URL: optional,
      // Loads Plausible for this domain, from SITE_PLAUSIBLE_HOST when set
      // (a self-hosted instance) or from Plausible's own servers.
      SITE_PLAUSIBLE_DOMAIN: optional,
      SITE_PLAUSIBLE_HOST: optional,
    },
  },
  i18n: {
    defaultLocale,
    locales: [...locales],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [react()],
  output: "static",
  vite: { plugins: [tailwindcss()] },
};

// The public origin, such as https://example.com, for canonical and
// alternate-language links. Astro reads its config before loading .env
// files, so this one comes from the process environment.
const site = process.env["SITE_URL"]?.trim();

if (site !== undefined && site !== "") {
  config.site = site;
}

export default defineConfig(config);
