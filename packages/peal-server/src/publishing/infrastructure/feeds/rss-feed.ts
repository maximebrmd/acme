import { Option } from "effect";

import { rfc822Date } from "./feed-dates.ts";
import { identityOf } from "./raw-feed.ts";
import type { RawFeed, RawItem } from "./raw-feed.ts";
import { attributeOf, childNamed, childrenNamed } from "./xml-tree.ts";
import type { XmlElement } from "./xml-tree.ts";

/** Media RSS's namespace (https://www.rssboard.org/media-rss). */
export const mediaRssNamespace = "http://search.yahoo.com/mrss/";

// The content module's namespace, whose `encoded` holds an item's HTML.
const contentNamespace = "http://purl.org/rss/1.0/modules/content/";

const textOf = (element: XmlElement, name: string, uri = "") =>
  childNamed(element, name, uri).pipe(
    Option.map(({ allText }) => allText.trim()),
    Option.filter((text) => text.length > 0)
  );

const isImage = (type: Option.Option<string>) =>
  Option.exists(type, (value) =>
    value.trim().toLowerCase().startsWith("image/")
  );

// An image Media RSS gives, in the element or one of its groups: an image
// content first, then a thumbnail.
export const mediaPictureIn = (element: XmlElement): Option.Option<string> => {
  const places = [
    element,
    ...childrenNamed(element, "group", mediaRssNamespace),
  ];

  const contents = places.flatMap((place) =>
    childrenNamed(place, "content", mediaRssNamespace)
  );

  const image = contents.find(
    (content) =>
      Option.contains(attributeOf(content, "medium"), "image") ||
      isImage(attributeOf(content, "type"))
  );

  const thumbnail = places
    .flatMap((place) => childrenNamed(place, "thumbnail", mediaRssNamespace))
    .at(0);

  return Option.fromUndefinedOr(image ?? thumbnail).pipe(
    Option.flatMap((chosen) => attributeOf(chosen, "url"))
  );
};

// An RSS item's picture: an image enclosure, else Media RSS's.
const pictureOf = (item: XmlElement): Option.Option<string> =>
  Option.fromUndefinedOr(
    childrenNamed(item, "enclosure").find((enclosure) =>
      isImage(attributeOf(enclosure, "type"))
    )
  ).pipe(
    Option.flatMap((enclosure) => attributeOf(enclosure, "url")),
    Option.orElse(() => mediaPictureIn(item))
  );

const itemOf = (item: XmlElement): RawItem => {
  const guid = childNamed(item, "guid").pipe(
    Option.map((element) => ({
      isPermaLink: !Option.contains(
        attributeOf(element, "isPermaLink").pipe(
          Option.map((value) => value.trim())
        ),
        "false"
      ),
      value: element.allText.trim(),
    })),
    Option.filter(({ value }) => value.length > 0)
  );

  const title = textOf(item, "title");
  const pubDate = textOf(item, "pubDate");
  const description = textOf(item, "description");

  // A guid that is a permalink is the item's address when it gives none.
  const link = textOf(item, "link").pipe(
    Option.orElse(() =>
      guid.pipe(
        Option.filter(({ isPermaLink }) => isPermaLink),
        Option.map(({ value }) => value)
      )
    )
  );

  // The guid, else the link, else the title with the date, else what it
  // says: "at least one of title or description must be present".
  const identity = guid.pipe(
    Option.map(({ value }) => identityOf("guid", value)),
    Option.orElse(() =>
      textOf(item, "link").pipe(
        Option.map((address) => identityOf("link", address))
      )
    ),
    Option.orElse(() =>
      title.pipe(
        Option.map((text) =>
          identityOf(
            "title",
            `${text}\u0000${Option.getOrElse(pubDate, () => "")}`
          )
        )
      )
    ),
    Option.orElse(() =>
      description.pipe(Option.map((text) => identityOf("description", text)))
    ),
    Option.getOrElse(() => "")
  );

  return {
    identity,
    link,
    picture: pictureOf(item),
    publishedAt: pubDate.pipe(Option.flatMap(rfc822Date)),
    summary: description.pipe(
      Option.orElse(() => textOf(item, "encoded", contentNamespace))
    ),
    summaryIsText: false,
    title,
  };
};

/** An RSS 2.0 document's channel and items, its root being `rss`. */
export const rssFeed = (root: XmlElement): RawFeed => {
  const channel = childNamed(root, "channel");

  return Option.match(channel, {
    onNone: () => ({ items: [], title: Option.none() }),
    onSome: (found) => ({
      items: childrenNamed(found, "item").map(itemOf),
      title: textOf(found, "title"),
    }),
  });
};
