import {
  Cause,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Result,
} from "effect";
import { Digest } from "effect/crypto";
import { Headers, HttpClientRequest } from "effect/http";
import type { HttpClientError, HttpClientResponse } from "effect/http";

import { FeedReadFailed } from "#publishing/application/feed-read-failed.ts";
import { FeedSource } from "#publishing/application/feed-source.ts";
import { feedHostOf } from "#publishing/domain/feed-address.ts";
import { FeedDocument } from "#publishing/domain/feed-document.ts";
import { FeedEntry } from "#publishing/domain/feed-entry.ts";
import type { FeedReadFailure } from "#publishing/domain/feed-read-failure.ts";
import type { FeedValidators } from "#publishing/domain/feed.ts";
import { maxFeedBytes } from "#publishing/domain/feed.ts";
import { ItemDigestSchema } from "#publishing/domain/item-digest.ts";
import { storableLine } from "#shared/domain/platform-text.ts";
import { publicUrlConfig } from "#shared/infrastructure/environment.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { publicHttpClientWith } from "#shared/infrastructure/platforms/public-http.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";

import type { CleanItem } from "./raw-feed.ts";
import { readFeed } from "./read-feed.ts";

/** How long a whole read may take, redirects and the body included. */
export const feedReadTimeout = "20 seconds";

// How many redirects an address may answer with before the feed. Each is
// a new request, which the OutboundGuard checks as it does the first.
const maxRedirects = 3;

const redirects: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

// What a feed reader asks for, the formats Peal reads first.
const accept =
  "application/rss+xml, application/atom+xml, application/feed+json, application/xml;q=0.9, text/xml;q=0.8";

// The longest validator kept: an ETag or a date is far shorter.
const maxValidatorLength = 256;

const failed = (
  failure: FeedReadFailure,
  retryAfterSeconds: Option.Option<number> = Option.none()
) => new FeedReadFailed({ failure, retryAfterSeconds });

const timedOut = (failure: HttpClientError.HttpClientError) =>
  failure.reason._tag === "TransportError" &&
  Cause.isTimeoutError(failure.reason.cause);

const failureOf = (
  failure: HttpClientError.HttpClientError | OutboundRequestRefused
): FeedReadFailed => {
  if (failure._tag === "OutboundRequestRefused") {
    return failed(
      failure.reason === "notHttps" || failure.reason === "notPublic"
        ? "refused"
        : "unreachable"
    );
  }

  return failed(timedOut(failure) ? "timeout" : "unreachable");
};

// Where a redirect leads, when it says where.
const locationOf = (
  response: HttpClientResponse.HttpClientResponse,
  from: URL
): Option.Option<URL> =>
  Headers.get(response.headers, "location").pipe(
    Option.filter((location) => URL.canParse(location, from.href)),
    Option.map((location) => new URL(location, from))
  );

const validatorOf = (
  response: HttpClientResponse.HttpClientResponse,
  name: string
): Option.Option<string> =>
  Headers.get(response.headers, name).pipe(
    Option.map((value) => storableLine(value, maxValidatorLength)),
    Option.filter((value) => value.length > 0)
  );

// What a host's refusal means: wait as it asks, try later, or stop.
const statusFailure = (
  response: HttpClientResponse.HttpClientResponse,
  now: DateTime.Utc
): FeedReadFailed => {
  const wait = retryAfterOf(response.headers, now).pipe(
    Option.map((duration) => Math.ceil(Duration.toMillis(duration) / 1000))
  );

  if (response.status === 429) {
    return failed("rateLimited", wait);
  }

  if (response.status >= 500) {
    return failed("serverError", wait);
  }

  if (response.status === 404) {
    return failed("notFound");
  }

  return failed(response.status === 410 ? "gone" : "unreachable");
};

const xmlEncodingPattern =
  /^<\?xml[^>]*encoding\s*=\s*["'](?<label>[\w.:-]+)["']/u;

type Encoding = NonNullable<ConstructorParameters<typeof TextDecoder>[0]>;

// The encodings a feed's XML declaration may name that Peal reads, by
// the label it gives: feeds are UTF-8 nearly always, Latin-1 or UTF-16
// now and then.
const encodings = new Map<string, Encoding>([
  ["iso-8859-1", "iso-8859-1"],
  ["iso-8859-15", "iso-8859-15"],
  ["latin1", "iso-8859-1"],
  ["us-ascii", "windows-1252"],
  ["utf-16", "utf-16le"],
  ["utf-16be", "utf-16be"],
  ["utf-16le", "utf-16le"],
  ["utf-8", "utf-8"],
  ["utf-8", "utf-8"],
  ["windows-1252", "windows-1252"],
]);

// The encoding a byte order mark names, if one.
const byteOrderMarkOf = (bytes: Uint8Array): Encoding | undefined => {
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return "utf-16be";
  }

  return bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le" : undefined;
};

// The body as text, in the encoding a byte order mark names, else the
// XML declaration, else UTF-8; one the runtime does not know is read as
// UTF-8.
const textOf = (bytes: Uint8Array): string => {
  const marked = byteOrderMarkOf(bytes);

  const declared = xmlEncodingPattern
    .exec(new TextDecoder("utf-8").decode(bytes.subarray(0, 200)))
    ?.groups?.["label"]?.toLowerCase();

  const encoding = marked ?? encodings.get(declared ?? "utf-8") ?? "utf-8";

  return Result.try(() => new TextDecoder(encoding)).pipe(
    Result.getOrElse(() => new TextDecoder("utf-8")),
    (decoder) => decoder.decode(bytes)
  );
};

const encoder = new TextEncoder();

/**
 * FeedSource over the public HTTP client: each request, redirects
 * included (three at most, followed here), goes through the
 * OutboundGuard, carries no credential or trace context, names Peal's
 * server as a feed reader and the validators of the last read, and its
 * answer is cut off past `maxFeedBytes`; the whole read has
 * `feedReadTimeout`. The address is never logged or traced past its host:
 * its path or query may hold a token of the site's.
 */
export const HttpFeedSource = Layer.effect(
  FeedSource,
  Effect.gen(function* HttpFeedSource() {
    // One byte past the limit is read, so a longer answer is told apart
    // from one exactly as long, and nothing more is downloaded.
    const http = yield* publicHttpClientWith({
      maxResponseBytes: maxFeedBytes + 1,
      overflow: "truncate",
      timeout: feedReadTimeout,
    });

    const digest = yield* Digest.Digest;
    const { host } = new URL(yield* publicUrlConfig);
    const userAgent = `Peal feed reader (+https://${host}/)`;

    const requestFor = (url: URL, validators: FeedValidators) =>
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          accept,
          "user-agent": userAgent,
          ...Option.match(validators.etag, {
            onNone: () => ({}),
            onSome: (etag) => ({ "if-none-match": etag }),
          }),
          ...Option.match(validators.lastModified, {
            onNone: () => ({}),
            onSome: (date) => ({ "if-modified-since": date }),
          }),
        })
      );

    const follow = (
      url: URL,
      validators: FeedValidators,
      followed: number
    ): Effect.Effect<
      {
        readonly response: HttpClientResponse.HttpClientResponse;
        readonly url: URL;
      },
      FeedReadFailed
    > =>
      http.execute(requestFor(url, validators)).pipe(
        Effect.mapError(failureOf),
        Effect.flatMap((response) => {
          if (!redirects.has(response.status)) {
            return Effect.succeed({ response, url });
          }

          if (followed === maxRedirects) {
            return Effect.fail(failed("unreachable"));
          }

          return Option.match(locationOf(response, url), {
            onNone: () => Effect.fail(failed("unreachable")),
            onSome: (next) => follow(next, validators, followed + 1),
          });
        })
      );

    const entryOf = Effect.fnUntraced(function* entryOf(item: CleanItem) {
      const hex = yield* digest
        .digestHex(Digest.sha256, encoder.encode(item.identity))
        .pipe(Effect.orDie);

      return new FeedEntry({
        digest: ItemDigestSchema.make(hex),
        link: item.link,
        pictureUrl: item.pictureUrl,
        publishedAt: item.publishedAt,
        summary: item.summary,
        title: item.title,
      });
    });

    const read = (address: string, validators: FeedValidators) =>
      Effect.gen(function* reading() {
        const { response, url } = yield* follow(
          new URL(address),
          validators,
          0
        );

        if (response.status === 304) {
          return { _tag: "notModified" } as const;
        }

        if (response.status !== 200) {
          return yield* statusFailure(response, yield* DateTime.now);
        }

        const bytes = new Uint8Array(
          yield* response.arrayBuffer.pipe(
            Effect.mapError(() => failed("unreachable"))
          )
        );

        if (bytes.byteLength > maxFeedBytes) {
          return yield* failed("tooLarge");
        }

        const feed = readFeed(textOf(bytes), url.href);

        if (Option.isNone(feed)) {
          return yield* failed("notAFeed");
        }

        const items = yield* Effect.all(
          feed.value.items.map((item) => entryOf(item))
        );

        return {
          _tag: "read",
          document: new FeedDocument({ items, title: feed.value.title }),
          validators: {
            etag: validatorOf(response, "etag"),
            lastModified: validatorOf(response, "last-modified"),
          },
        } as const;
      }).pipe(
        Effect.timeoutOrElse({
          duration: feedReadTimeout,
          orElse: () => Effect.fail(failed("timeout")),
        }),
        Effect.withTracerEnabled(false),
        Effect.annotateLogs({ feedHost: feedHostOf(address) })
      );

    return FeedSource.of({ read });
  })
);
