import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { unpublishBlocker } from "#publishing/domain/live-post-support.ts";
import { platforms } from "#shared/domain/platform.ts";
import type { Platform } from "#shared/domain/platform.ts";

// The docs' table of where Peal deletes posts, in both languages, says
// what live-post-support.ts says.

const docs = path.join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "peal-docs",
  "docs"
);

const names = new Map<string, Platform>([
  ["Bluesky", "bluesky"],
  ["Facebook Pages", "facebook"],
  ["Google Business Profile", "googleBusiness"],
  ["Instagram", "instagram"],
  ["LinkedIn", "linkedin"],
  ["Mastodon", "mastodon"],
  ["Pinterest", "pinterest"],
  ["Threads", "threads"],
  ["TikTok", "tiktok"],
  ["X", "x"],
  ["YouTube", "youtube"],
]);

// The table under the page's #unpublish heading: each platform, and
// whether Peal deletes posts there.
const tableOf = async (page: string) => {
  const text = await readFile(path.join(docs, page), "utf-8");
  const section = text.slice(text.indexOf("[#unpublish]"));
  const rows = new Map<Platform, boolean>();

  for (const line of section.split("\n")) {
    const [, name = "", answer = ""] = line
      .split("|")
      .map((cell) => cell.trim());

    const platform = names.get(name);

    if (platform !== undefined && !rows.has(platform)) {
      rows.set(platform, answer === "Yes" || answer === "Oui");
    }
  }

  return Object.fromEntries(rows);
};

const expected = Object.fromEntries(
  platforms.map((platform) => [
    platform,
    Option.isNone(unpublishBlocker(platform)),
  ])
);

describe("the docs' table of where Peal deletes posts", () => {
  it.each(["scheduling.mdx", "fr/scheduling.mdx"])(
    "is live-post-support's, in %s",
    async (page) => {
      await expect(tableOf(page)).resolves.toStrictEqual(expected);
    }
  );
});
