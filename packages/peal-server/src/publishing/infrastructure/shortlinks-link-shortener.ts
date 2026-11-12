import { Effect, Layer, Option } from "effect";

import { LinkShortener } from "#publishing/application/link-shortener.ts";
import {
  ShortLinkBase,
  shortCodeLength,
} from "#shortlinks/application/short-link-base.ts";
import { ShortLinks } from "#shortlinks/application/short-links.ts";

/**
 * LinkShortener through the shortlinks context: its base, and its links,
 * issued once per target, part and destination. Needs ShortLinks and
 * ShortLinkBase.
 */
export const ShortLinksLinkShortener = Layer.effect(
  LinkShortener,
  Effect.gen(function* ShortLinksLinkShortener() {
    const links = yield* ShortLinks;
    const { base } = yield* ShortLinkBase;

    return LinkShortener.of({
      addresses: base.pipe(
        Option.map((url) => ({ base: url.href, codeLength: shortCodeLength }))
      ),
      shortened: (ask) => links.issue(ask),
    });
  })
);
