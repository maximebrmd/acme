import { PlatformSchema } from "peal-contract";
import type { Platform } from "peal-contract";
import {
  maxFollowUps,
  maxMediaPerPost,
  platformRules,
} from "peal-contract/post-text";
import type {
  PlatformRules,
  TextLimit,
  TextUnit,
} from "peal-contract/post-text";

// What each platform takes of a post, as docs variables such as
// `{{platform-bluesky-text-en}}`, from the contract's rules, which the server
// and every client check posts against: the Platforms pages never copy a
// limit by hand.

const locales = ["en", "fr"] as const;

type Locale = (typeof locales)[number];

// The slug of each platform's page, and its name.
const pages: Readonly<Record<Platform, { name: string; slug: string }>> = {
  bluesky: { name: "Bluesky", slug: "bluesky" },
  facebook: { name: "Facebook", slug: "facebook" },
  googleBusiness: { name: "Google Business Profile", slug: "google-business" },
  instagram: { name: "Instagram", slug: "instagram" },
  linkedin: { name: "LinkedIn", slug: "linkedin" },
  mastodon: { name: "Mastodon", slug: "mastodon" },
  pinterest: { name: "Pinterest", slug: "pinterest" },
  threads: { name: "Threads", slug: "threads" },
  tiktok: { name: "TikTok", slug: "tiktok" },
  x: { name: "X", slug: "x" },
  youtube: { name: "YouTube", slug: "youtube" },
};

const words = {
  en: {
    alt: { hidden: "Not shown", shown: "Shown" },
    bytes: "bytes",
    characters: "characters",
    comments: (count: number) => `Up to ${count} comments under the post`,
    countedBy: (name: string) => `as ${name} counts them`,
    feed: "Feed",
    files: (count: number) => `Up to ${count}`,
    oneVideo: "one video at most",
    required: "required",
    single: "One post",
    thread: (count: number) => `A thread, up to ${count} more parts`,
  },
  fr: {
    alt: { hidden: "Non affiché", shown: "Affiché" },
    bytes: "octets",
    characters: "caractères",
    comments: (count: number) =>
      `Jusqu’à ${count} commentaires sous la publication`,
    countedBy: (name: string) => `comptés comme ${name} les compte`,
    feed: "Fil",
    files: (count: number) => `Jusqu’à ${count}`,
    oneVideo: "une vidéo au plus",
    required: "obligatoire",
    single: "Une seule publication",
    thread: (count: number) => `Un fil, jusqu’à ${count} parties de plus`,
  },
} as const;

const number = (locale: Locale, value: number) =>
  new Intl.NumberFormat(locale).format(value);

// How each unit reads: plain characters, bytes, or characters counted the
// platform's own way (emoji by their bytes on Threads, UTF-16 units on
// TikTok, X's weighted count).
const unitReading: Readonly<Record<TextUnit, "bytes" | "characters" | "own">> =
  {
    codePoints: "characters",
    emojiBytes: "own",
    graphemes: "characters",
    utf16Units: "own",
    utf8Bytes: "bytes",
    weighted: "own",
  };

const textLimit = (locale: Locale, name: string, limit: TextLimit) => {
  const said = words[locale];
  const count = number(locale, limit.maximum);
  const reading = unitReading[limit.unit];

  if (reading === "bytes") {
    return `${count} ${said.bytes}`;
  }

  return reading === "characters"
    ? `${count} ${said.characters}`
    : `${count} ${said.characters}, ${said.countedBy(name)}`;
};

const media = (locale: Locale, rules: PlatformRules) => {
  const said = words[locale];

  const parts = [
    said.files(Math.min(rules.maxMedia ?? maxMediaPerPost, maxMediaPerPost)),
  ];

  if (rules.media?.maxVideos === 1) {
    parts.push(said.oneVideo);
  }

  if (rules.mediaRequired) {
    parts.push(said.required);
  }

  return parts.join(", ");
};

const followUps = (locale: Locale, rules: PlatformRules) => {
  const said = words[locale];
  const count = Math.min(rules.followUps?.maximum ?? 0, maxFollowUps);

  if (rules.followUps === undefined) {
    return said.single;
  }

  return rules.followUps.kind === "thread"
    ? said.thread(count)
    : said.comments(count);
};

const formats = (locale: Locale, rules: PlatformRules) =>
  [words[locale].feed, ...Object.keys(rules.postFormats ?? {})].join(", ");

const altText = (locale: Locale, rules: PlatformRules) =>
  rules.media?.showsAltText === true
    ? words[locale].alt.shown
    : words[locale].alt.hidden;

export const platformVariables: Record<string, string> = Object.fromEntries(
  locales.flatMap((locale) =>
    PlatformSchema.literals.flatMap((platform) => {
      const rules = platformRules[platform];
      const { name, slug } = pages[platform];
      const key = (field: string) => `platform-${slug}-${field}-${locale}`;

      return [
        [
          key("text"),
          rules.textLimits
            .map((limit) => textLimit(locale, name, limit))
            .join(locale === "fr" ? " ; " : "; "),
        ],
        [key("media"), media(locale, rules)],
        [key("parts"), followUps(locale, rules)],
        [key("formats"), formats(locale, rules)],
        [key("alt"), altText(locale, rules)],
      ];
    })
  )
);
