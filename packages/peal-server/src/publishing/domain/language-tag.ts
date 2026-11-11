/**
 * A BCP 47 tag (RFC 5646's langtag), as a Bluesky post's languages and a
 * YouTube video's default language take it. Bluesky's `language` format
 * reads it (`isValidLanguage` in atproto's syntax package, read 2026-11-11): a
 * primary language of two or three letters, up to three extended ones, a
 * script of four letters, a region of two letters or three digits,
 * variants, extensions behind a singleton, and private use behind `x`,
 * such as "en", "pt-BR", "zh-Hant-TW" or "es-419". Peal takes no
 * grandfathered tag, and does not look for a variant or a singleton
 * repeated, which the PDS also refuses.
 */
export const languageTag =
  /^[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|\d{3}))?(?:-(?:[A-Za-z\d]{5,8}|\d[A-Za-z\d]{3}))*(?:-[\dA-WY-Za-wy-z](?:-[A-Za-z\d]{2,8})+)*(?:-[Xx](?:-[A-Za-z\d]{1,8})+)?$/u;
