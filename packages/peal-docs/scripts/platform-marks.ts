// Writes public/platform-marks/<slug>.svg, the mark each Platforms page shows
// in the sidebar: the brand's own, from simple-icons (CC0) in its colour, as
// the web app's BrandMark draws it, and a lettered tile for a brand that
// asked to be left out of that set (LinkedIn). Never draw a logo from memory
// (DESIGN.md, "Icons"). Run after upgrading simple-icons:
// bun packages/peal-docs/scripts/platform-marks.ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SimpleIcon } from "simple-icons";
import {
  siBluesky,
  siFacebook,
  siGoogle,
  siInstagram,
  siMastodon,
  siPinterest,
  siThreads,
  siTiktok,
  siX,
  siYoutube,
} from "simple-icons";

const marks = {
  bluesky: siBluesky,
  facebook: siFacebook,
  "google-business": siGoogle,
  instagram: siInstagram,
  linkedin: null,
  mastodon: siMastodon,
  pinterest: siPinterest,
  threads: siThreads,
  tiktok: siTiktok,
  x: siX,
  youtube: siYoutube,
} satisfies Readonly<Record<string, SimpleIcon | null>>;

const svgOf = (icon: SimpleIcon) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${icon.hex}"><path d="${icon.path}"/></svg>\n`;

// The muted tile and ink of DESIGN.md, with the brand's initials.
const tile = (letters: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#E7E5E4"/><text x="12" y="16.5" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="600" fill="#0C0A09">${letters}</text></svg>\n`;

const folder = path.join(import.meta.dirname, "..", "public", "platform-marks");

await mkdir(folder, { recursive: true });

await Promise.all(
  Object.entries(marks).map(async ([slug, icon]) => {
    await writeFile(
      path.join(folder, `${slug}.svg`),
      icon === null ? tile("in") : svgOf(icon)
    );
  })
);
