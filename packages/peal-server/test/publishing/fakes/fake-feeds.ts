import { DateTime, Effect, Layer, Option, Ref } from "effect";

import { FeedNotices } from "#publishing/application/feed-notices.ts";
import { FeedPictures } from "#publishing/application/feed-pictures.ts";
import type { FeedPicture } from "#publishing/application/feed-pictures.ts";
import { FeedReadFailed } from "#publishing/application/feed-read-failed.ts";
import { FeedSource } from "#publishing/application/feed-source.ts";
import type { FeedRead } from "#publishing/application/feed-source.ts";
import { FeedDocument } from "#publishing/domain/feed-document.ts";
import { FeedEntry } from "#publishing/domain/feed-entry.ts";
import type { FeedReadFailure } from "#publishing/domain/feed-read-failure.ts";
import type { FeedStopReason } from "#publishing/domain/feed-stop-reason.ts";
import { ItemDigestSchema } from "#publishing/domain/item-digest.ts";

// Feeds as a test serves them, by address, read in memory; and the stops
// they told, as the notifications would key them. The state is the
// module's: tests that use it run one at a time, and set it first
// (`resetFeeds`).

/** An item a test serves: its number names its digest. */
export interface ServedItem {
  readonly at?: string;
  readonly link?: string;
  readonly n: number;
  readonly picture?: string;
  readonly summary?: string;
  readonly title?: string;
}

/** What an address answers. */
export type Served =
  | { readonly _tag: "feed"; readonly items: readonly ServedItem[] }
  | { readonly _tag: "failing"; readonly failure: FeedReadFailure };

/** A stop as it was told, with the key that names it. */
export interface ToldStop {
  readonly feedId: string;
  readonly key: string;
  readonly reason: FeedStopReason;
}

const served = Ref.makeUnsafe<ReadonlyMap<string, Served>>(new Map());
const reads = Ref.makeUnsafe<readonly string[]>([]);
const told = Ref.makeUnsafe<readonly ToldStop[]>([]);

// What each picture's address gives, and the imports asked for.
const pictures = Ref.makeUnsafe<ReadonlyMap<string, FeedPicture>>(new Map());

const imported = Ref.makeUnsafe<
  readonly { readonly altText: string; readonly url: string }[]
>([]);

/** The digest of item `n`. */
export const digestOf = (n: number) =>
  ItemDigestSchema.make(n.toString(16).padStart(64, "0"));

/** The entry item `n` is, as the source gives it. */
export const entryOf = (item: ServedItem) =>
  new FeedEntry({
    digest: digestOf(item.n),
    link: Option.fromUndefinedOr(item.link),
    pictureUrl: Option.fromUndefinedOr(item.picture),
    publishedAt: Option.fromUndefinedOr(item.at).pipe(
      Option.map((at) => DateTime.makeUnsafe(at))
    ),
    summary: Option.fromUndefinedOr(item.summary),
    title: Option.fromUndefinedOr(item.title),
  });

/** Nothing served, nothing read, nothing told. */
export const resetFeeds = Effect.all([
  Ref.set(served, new Map()),
  Ref.set(reads, []),
  Ref.set(told, []),
  Ref.set(pictures, new Map()),
  Ref.set(imported, []),
]);

/** What importing the picture at `url` gives from now on. */
export const picturesGive = (url: string, picture: FeedPicture) =>
  Ref.update(pictures, (map) => new Map([...map, [url, picture]]));

/** The pictures imported so far, with the alt text each was given. */
export const importedPictures = Ref.get(imported);

/** What `url` answers from now on. */
export const serve = (url: string, answer: Served) =>
  Ref.update(served, (map) => new Map([...map, [url, answer]]));

/** `url` serves a feed of these items, newest first. */
export const serveItems = (url: string, items: readonly ServedItem[]) =>
  serve(url, { _tag: "feed", items });

/** The addresses read so far, in order. */
export const readAddresses = Ref.get(reads);

/** The stops told so far. */
export const toldStops = Ref.get(told);

/**
 * A source that reads what `serve` set, notices that keep stops, and
 * pictures that give what `picturesGive` set (or fail).
 */
export const FakeFeeds = Layer.mergeAll(
  Layer.succeed(
    FeedPictures,
    FeedPictures.of({
      attach: (_actor, url, altText) =>
        Ref.update(imported, (all) => [...all, { altText, url }]).pipe(
          Effect.andThen(Ref.get(pictures)),
          Effect.map(
            (map): FeedPicture =>
              map.get(url) ?? { _tag: "skipped", reason: "unreachable" }
          )
        ),
    })
  ),
  Layer.succeed(
    FeedSource,
    FeedSource.of({
      read: (url) =>
        Effect.gen(function* reading() {
          yield* Ref.update(reads, (all) => [...all, url]);

          const answer = (yield* Ref.get(served)).get(url);

          if (answer === undefined || answer._tag === "failing") {
            return yield* new FeedReadFailed({
              failure: answer?.failure ?? "notFound",
              retryAfterSeconds: Option.none(),
            });
          }

          const read: FeedRead = {
            _tag: "read",
            document: new FeedDocument({
              items: answer.items.map(entryOf),
              title: Option.some("A synthetic blog"),
            }),
            validators: { etag: Option.none(), lastModified: Option.none() },
          };

          return read;
        }),
    })
  ),
  Layer.succeed(
    FeedNotices,
    FeedNotices.of({
      stopped: (feed, reason) =>
        Ref.update(told, (stops) => [
          ...stops,
          {
            feedId: feed.id,
            key: `feed-stopped:${feed.id}:${
              feed.status._tag === "stopped"
                ? String(DateTime.toEpochMillis(feed.status.stoppedAt))
                : ""
            }`,
            reason,
          },
        ]),
    })
  )
);
