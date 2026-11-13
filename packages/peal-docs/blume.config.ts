import { defineConfig } from "blume";
import { anthropic } from "blume/ai";
import { plausible } from "blume/analytics";
import type { PlausibleAdapter, PlausibleOptions } from "blume/analytics";
import { turnstile } from "blume/captcha";
import { node } from "blume/deploy";
import { openapi } from "blume/reference";

import { platformVariables } from "./platform-variables.ts";
import { pricingVariables } from "./pricing-variables.ts";
import { retentionVariables } from "./retention-variables.ts";

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

// The assistant, a chat that answers from these pages, is on when a model is
// named, such as claude-haiku-5-5. It needs a server route, so the docs then
// build as a Node server rather than static files; the key is read when a
// question comes, from DOCS_ANTHROPIC_API_KEY, and never written into the
// build. Behind the proxy that answers for DOCS_SITE_URL, the rate limit
// counts each reader by the X-Forwarded-For that proxy sets.
const assistantModel = fromEnvironment("DOCS_ASSISTANT_MODEL");

// Turnstile asks a reader's browser, before a question, whether it is a
// script; the route checks the answer with TURNSTILE_SECRET_KEY.
const turnstileSiteKey = fromEnvironment("DOCS_TURNSTILE_SITE_KEY");

const deployment = () => {
  if (assistantModel === undefined) {
    return site === undefined ? {} : { site };
  }

  return node(
    site === undefined
      ? {}
      : { allowedDomains: [{ hostname: new URL(site).hostname }], site }
  );
};

const assistant = () => {
  if (assistantModel === undefined) {
    return { enabled: false };
  }

  const settings = {
    enabled: true,
    instructions:
      "You are Peal's documentation assistant. Peal is a social media scheduling platform. Answer in the language of the question, in a few short paragraphs or a list, with the exact names the app and the API use. Name no other product or company. When the pages do not cover something, say so and point to the closest page.",
    provider: anthropic({
      apiKeyEnv: "DOCS_ANTHROPIC_API_KEY",
      model: assistantModel,
      // The pages carry the answer: little thinking, a quicker reply.
      reasoning: "low",
    }),
    suggestions: [
      { icon: "cable", label: "How do I connect an Instagram account?" },
      { icon: "calendar-days", label: "How do I schedule a post?" },
      { icon: "code-xml", label: "How do I publish a post with the API?" },
      { icon: "server", label: "What does a self-hosted Peal need?" },
    ],
  };

  return turnstileSiteKey === undefined
    ? settings
    : { ...settings, captcha: turnstile({ siteKey: turnstileSiteKey }) };
};

// The pages' addresses before the tabs (old, new), so links already out
// there still land, in both languages; the browser keeps the #anchor.
const moved: [string, string][] = [
  ["/channels", "/guides/channels"],
  ["/scheduling", "/guides/posts"],
  ["/organise", "/guides/posts/organise"],
  ["/review", "/guides/posts/review"],
  ["/media", "/guides/media"],
  ["/notifications", "/guides/workspace/notifications"],
  ["/inbox", "/guides/engage/inbox"],
  ["/analytics", "/guides/engage/analytics"],
  ["/ads", "/guides/engage/ads"],
  ["/settings", "/guides/workspace"],
  ["/billing", "/guides/workspace/billing"],
  ["/api-overview", "/developers"],
  ["/api-conventions", "/developers/conventions"],
  ["/posting-api", "/developers/posting"],
  ["/sdks", "/developers/sdks"],
  ["/webhooks", "/developers/webhooks"],
  ["/cli", "/developers/cli"],
  ["/mcp", "/developers/mcp"],
  ["/agents", "/developers/agents"],
  ["/embedding", "/developers/embedding"],
  ["/environment-variables", "/self-hosting/environment-variables"],
  ["/staff", "/self-hosting/staff"],
  [
    "/deployment",
    "https://github.com/peal-social/peal/blob/main/packages/peal-infra/DEPLOYMENT.md",
  ],
];

const redirects = moved.flatMap(([from, to]) => [
  { from, to },
  { from: `/fr${from}`, to: to.startsWith("/") ? `/fr${to}` : to },
]);

export default defineConfig({
  agents: {
    llmsTxt: {
      details:
        "Peal is a fair-source social media scheduling platform: teams write a post once, schedule it across platforms and see how it performs. It can be self-hosted with Postgres and an S3-compatible store. The API reference lists every HTTP endpoint.",
      enabled: true,
    },
  },
  ai: { assistant: assistant() },
  analytics: analytics(),
  deployment: deployment(),
  description:
    "Schedule social media posts across platforms, from one place. Guides, self-hosting and the HTTP API reference.",
  // The public repository, which the footer links to, and each page's
  // "Edit this page" link (dir is where the docs sit in it).
  github: { dir: "packages/peal-docs", owner: "peal-social", repo: "peal" },
  i18n: {
    defaultLocale: "en",
    locales: [
      { code: "en", label: "English" },
      { code: "fr", label: "Français" },
    ],
  },
  // The mark shows beside the title. Blume finds the favicon and the Apple
  // touch icon in public/ by their file names.
  logo: "/favicon.svg",
  // One tab per reader, each a folder of docs/ (DESIGN.md, Docs): the
  // loose pages at the root are Get started.
  navigation: {
    // A section with pages of its own drills down, as the app's sidebar
    // does: its pages replace the list, under a link back.
    sidebar: { display: "page" },
    tabs: [
      {
        label: { en: "Get started", fr: "Démarrer" },
        path: "/",
        icon: "house",
      },
      {
        label: { en: "Guides", fr: "Guides" },
        path: "/guides",
        icon: "square-pen",
      },
      {
        label: { en: "Platforms", fr: "Plateformes" },
        path: "/platforms",
        icon: "layout-grid",
      },
      {
        label: { en: "Developers", fr: "Développeurs" },
        path: "/developers",
        icon: "code-xml",
      },
      {
        label: { en: "API reference", fr: "Référence de l’API" },
        path: "/reference",
        icon: "braces",
      },
      {
        label: { en: "Self-hosting", fr: "Auto-hébergement" },
        path: "/self-hosting",
        icon: "server",
      },
    ],
  },
  redirects,
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
  // Light only, in the mark's blue and Geist, as DESIGN.md has it: no
  // toggle, and no reader's earlier choice of dark.
  theme: {
    accent: "#415EEE",
    fonts: { body: "geist", display: "geist", mono: "geist-mono" },
    mode: "light",
    toggle: false,
  },
  title: "Peal",
  // The plans' prices and limits, from the contract's catalogue, and the
  // retention periods, from its registry of what Peal does with data.
  variables: {
    ...platformVariables,
    ...pricingVariables,
    ...retentionVariables,
  },
});
