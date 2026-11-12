import { Option } from "effect";

import { atomFeed, atomNamespace } from "./atom-feed.ts";
import { jsonFeed } from "./json-feed.ts";
import { cleanItems, lineOf } from "./raw-feed.ts";
import type { CleanItem, RawFeed } from "./raw-feed.ts";
import { rssFeed } from "./rss-feed.ts";
import { parseXml } from "./xml-tree.ts";

/** A feed read and made storable, its items' identities still text. */
export interface ReadFeed {
  readonly items: readonly CleanItem[];
  readonly title: Option.Option<string>;
}

const fromXml = (text: string): Option.Option<RawFeed> =>
  parseXml(text).pipe(
    Option.flatMap((root) => {
      if (root.name === "rss" && root.uri === "") {
        return Option.some(rssFeed(root));
      }

      return root.name === "feed" && root.uri === atomNamespace
        ? Option.some(atomFeed(root))
        : Option.none();
    })
  );

/**
 * What a body says, told from its content alone, never from what its
 * host says it is: a JSON object whose `version` is JSON Feed's, an XML
 * document whose root is RSS's `rss` or Atom's `feed`, or none. Items'
 * addresses are made absolute against `base`, the feed's address.
 */
export const readFeed = (
  text: string,
  base: string
): Option.Option<ReadFeed> => {
  const body = text.replace(/^﻿/u, "").trimStart();

  return (body.startsWith("{") ? jsonFeed(body) : fromXml(body)).pipe(
    Option.map((feed) => ({
      items: cleanItems(feed, base),
      title: feed.title.pipe(Option.flatMap(lineOf)),
    }))
  );
};
