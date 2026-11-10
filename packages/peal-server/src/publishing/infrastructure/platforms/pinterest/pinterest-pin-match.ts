import { DateTime, Option } from "effect";

// Pinterest lists a Pin with the fields it was made with. Two are the same
// Pin when it was made since the attempt started and its title,
// description and link are the ones sent, spaces at their ends and runs of
// them aside, and its media is of the kind sent, when Pinterest says.

/** What Peal sent of a Pin. */
export interface SentPin {
  readonly description: string;
  readonly link: string;
  /** `image`, `multiple_images` or `video`, as Pinterest names them. */
  readonly mediaType: string;
  /** Pins made before this instant are an earlier attempt's, or not Peal's. */
  readonly since: DateTime.Utc;
  readonly title: string;
}

/** A Pin as Pinterest lists it. */
export interface ListedPin {
  readonly createdAt: Option.Option<string>;
  readonly description: string;
  readonly link: string;
  readonly mediaType: Option.Option<string>;
  readonly title: string;
}

const spaces = /\s+/gu;

const comparable = (text: string) =>
  text.normalize("NFC").replaceAll(spaces, " ").trim();

const trailingSlashes = /\/+$/u;

// An address as two links to it compare: its host in lower case, and no
// slash at the end of its path.
const addressOf = (link: string) => {
  const url = URL.parse(link.trim());

  return url === null
    ? comparable(link)
    : `${url.protocol}//${url.host}${url.pathname.replace(trailingSlashes, "")}${url.search}${url.hash}`;
};

const madeSince = (pin: ListedPin, since: DateTime.Utc) =>
  pin.createdAt.pipe(
    Option.flatMap(DateTime.make),
    Option.exists((createdAt) =>
      DateTime.isGreaterThanOrEqualTo(DateTime.toUtc(createdAt), since)
    )
  );

/**
 * Whether a Pin Pinterest lists is the one Peal sent. A Pin whose creation
 * time Pinterest does not give, or gives unreadably, is never taken for it.
 */
export const isSamePin = (sent: SentPin, listed: ListedPin): boolean =>
  madeSince(listed, sent.since) &&
  comparable(sent.title) === comparable(listed.title) &&
  comparable(sent.description) === comparable(listed.description) &&
  addressOf(sent.link) === addressOf(listed.link) &&
  Option.match(listed.mediaType, {
    onNone: () => true,
    onSome: (mediaType) => mediaType === sent.mediaType,
  });
