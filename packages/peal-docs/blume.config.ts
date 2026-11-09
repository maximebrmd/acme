import { defineConfig } from "blume";
import { plausible } from "blume/analytics";
import type { PlausibleAdapter, PlausibleOptions } from "blume/analytics";
import { openapi } from "blume/reference";

// Values that differ per deployment come from the environment, so the same
// sources build anyone's copy of the docs. Each is optional: an unset or empty
// variable turns its feature off.
const fromEnvironment = (name: string): string | undefined => {
  const value = process.env[name]?.trim();

  return value === undefined || value === "" ? undefined : value;
};

// Plausible counts visits only when a domain is configured, and Blume adds its
// script to production builds only. DOCS_PLAUSIBLE_HOST points at a
// self-hosted instance instead of Plausible's own.
const analytics = (): PlausibleAdapter[] => {
  const domain = fromEnvironment("DOCS_PLAUSIBLE_DOMAIN");

  if (domain === undefined) {
    return [];
  }

  const options: PlausibleOptions = { domain };
  const host = fromEnvironment("DOCS_PLAUSIBLE_HOST");

  if (host !== undefined) {
    options.host = host;
  }

  return [plausible(options)];
};

// The public origin, such as https://docs.example.com. Blume needs it for
// absolute links in llms.txt and the agent skill, the sitemap and Open Graph
// images; without it the site still builds, with relative links.
const site = fromEnvironment("DOCS_SITE_URL");

export default defineConfig({
  agents: {
    llmsTxt: {
      details:
        "Peal is a fair-source social media scheduling platform: teams write a post once, schedule it across platforms and see how it performs. It can be self-hosted with Postgres and an S3-compatible store. The API reference lists every HTTP endpoint.",
      enabled: true,
    },
  },
  analytics: analytics(),
  deployment: site === undefined ? {} : { site },
  description:
    "Schedule social media posts across platforms, from one place. Guides, self-hosting and the HTTP API reference.",
  i18n: {
    defaultLocale: "en",
    locales: [
      { code: "en", label: "English" },
      { code: "fr", label: "Français" },
    ],
  },
  navigation: {
    tabs: [
      { label: { en: "Guides", fr: "Guides" }, path: "/" },
      {
        label: { en: "API reference", fr: "Référence de l’API" },
        path: "/reference",
      },
    ],
  },
  reference: [
    // Written by `nx run peal-contract:openapi`, which every docs target
    // depends on, so the reference always matches the contract. The overlay
    // adds the placeholder origin. Try it stays off: the origin is not a real
    // server, and the API answers no cross-origin requests from the docs.
    openapi({
      overlays: ["./overlays/public.yaml"],
      playground: false,
      spec: "../peal-contract/openapi.json",
    }),
  ],
  title: "Peal",
});
