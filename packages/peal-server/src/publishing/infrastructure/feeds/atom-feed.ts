import { Option } from "effect";

import { textOfHtml } from "#shared/domain/html-text.ts";

import { rfc3339Date } from "./feed-dates.ts";
import { identityOf } from "./raw-feed.ts";
import type { RawFeed, RawItem } from "./raw-feed.ts";
import { mediaPictureIn } from "./rss-feed.ts";
import { attributeOf, childNamed, childrenNamed } from "./xml-tree.ts";
import type { XmlElement } from "./xml-tree.ts";

/** Atom's namespace (RFC 4287, section 2). */
export const atomNamespace = "http://www.w3.org/2005/Atom";

const childOf = (element: XmlElement, name: string) =>
  childNamed(element, name, atomNamespace);

const nonEmpty = (text: string) =>
  text.trim().length === 0 ? Option.none() : Option.some(text.trim());

interface TextConstruct {
  readonly isText: boolean;
  readonly value: string;
}

// An Atom text construct (RFC 4287, 3.1), and whether it is plain text:
// `text` is, `html` is escaped HTML, `xhtml` is markup whose text is
// read from its elements.
const textConstruct = (element: XmlElement): TextConstruct => {
  const type = attributeOf(element, "type").pipe(
    Option.map((value) => value.trim().toLowerCase()),
    Option.getOrElse(() => "text")
  );

  return { isText: type !== "html", value: element.allText };
};

// A title as plain text, whatever its type.
const titleOf = (element: XmlElement): Option.Option<string> =>
  childOf(element, "title").pipe(
    Option.map(textConstruct),
    Option.flatMap(({ isText, value }) =>
      nonEmpty(isText ? value : textOfHtml(value))
    )
  );

const relOf = (link: XmlElement) =>
  attributeOf(link, "rel").pipe(
    Option.map((value) => value.trim()),
    Option.getOrElse(() => "alternate")
  );

const entryOf = (entry: XmlElement): RawItem => {
  const links = childrenNamed(entry, "link", atomNamespace);

  const alternate = Option.fromUndefinedOr(
    links.find((link) => relOf(link) === "alternate")
  ).pipe(Option.flatMap((link) => attributeOf(link, "href")));

  const enclosure = Option.fromUndefinedOr(
    links.find(
      (link) =>
        relOf(link) === "enclosure" &&
        Option.exists(attributeOf(link, "type"), (type) =>
          type.trim().toLowerCase().startsWith("image/")
        )
    )
  ).pipe(Option.flatMap((link) => attributeOf(link, "href")));

  const summary = childOf(entry, "summary").pipe(
    Option.orElse(() => childOf(entry, "content")),
    Option.map(textConstruct),
    Option.filter(({ value }) => value.trim().length > 0)
  );

  const date = childOf(entry, "published").pipe(
    Option.orElse(() => childOf(entry, "updated")),
    Option.flatMap(({ allText }) => rfc3339Date(allText))
  );

  return {
    identity: childOf(entry, "id").pipe(
      Option.flatMap(({ allText }) => nonEmpty(allText)),
      Option.map((id) => identityOf("id", id)),
      Option.getOrElse(() => "")
    ),
    link: alternate,
    picture: enclosure.pipe(Option.orElse(() => mediaPictureIn(entry))),
    publishedAt: date,
    summary: summary.pipe(Option.map(({ value }) => value)),
    summaryIsText: Option.exists(summary, ({ isText }) => isText),
    title: titleOf(entry),
  };
};

/** An Atom document's title and entries, its root being Atom's `feed`. */
export const atomFeed = (root: XmlElement): RawFeed => ({
  items: childrenNamed(root, "entry", atomNamespace).map(entryOf),
  title: titleOf(root),
});
