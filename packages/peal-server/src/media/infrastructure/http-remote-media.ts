import { Effect, Layer, Option, Schema, Sink, Stream } from "effect";
import { Headers, HttpClientRequest } from "effect/http";
import type { HttpClientResponse } from "effect/http";

import { MediaSourceNotPublic } from "#media/application/media-source-not-public.ts";
import { MediaSourceUnreachable } from "#media/application/media-source-unreachable.ts";
import { RemoteMedia } from "#media/application/ports/remote-media.ts";
import type { RemoteFile } from "#media/application/ports/remote-media.ts";
import { maxByteSize } from "#media/domain/media-format.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { publicHttpClientWith } from "#shared/infrastructure/platforms/public-http.ts";

// A host that does not start answering within this time is not waited for.
const answerTimeout = "20 seconds";

// How many redirects an address may answer with before the file. Each one
// is a new request, which the OutboundGuard checks as it does the first:
// a public address cannot lead to one inside Peal's network.
const maxRedirects = 3;

const redirects: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

const decodeSize = Schema.decodeUnknownOption(
  Schema.NumberFromString.check(Schema.isInt(), Schema.isGreaterThan(0))
);

type Refusal = MediaSourceNotPublic | MediaSourceUnreachable;

const unreachable = (
  reason: MediaSourceUnreachable["reason"],
  status: Option.Option<number> = Option.none()
) => new MediaSourceUnreachable({ reason, status });

// What the guard's refusal means for an import: an address Peal does not
// fetch, or a host that cannot be found for now.
const refusalOf = ({ reason }: OutboundRequestRefused): Refusal => {
  if (reason === "notHttps" || reason === "notPublic") {
    return new MediaSourceNotPublic();
  }

  return unreachable(reason === "unknownHost" ? "unknownHost" : "noAnswer");
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

// An address with a user name or a password asks Peal to sign in somewhere.
const withoutCredentials = (raw: string): Option.Option<URL> =>
  Option.liftPredicate(raw, (address) => URL.canParse(address)).pipe(
    Option.map((address) => new URL(address)),
    Option.filter((url) => url.username === "" && url.password === "")
  );

/**
 * RemoteMedia over the public HTTP client: every request, redirects
 * included, goes through the OutboundGuard, carries no credentials, cookies
 * or trace context, and its answer is cut off past the largest file Peal
 * stores. Needs an HttpClient and the OutboundGuard. The address is never
 * logged: it can hold a token.
 */
export const HttpRemoteMedia = Layer.effect(
  RemoteMedia,
  Effect.gen(function* HttpRemoteMedia() {
    const http = yield* publicHttpClientWith({
      maxResponseBytes: maxByteSize.video + 1,
      timeout: answerTimeout,
    });

    // The host's answer to one request, a redirect included.
    const answerFrom = (url: URL) =>
      http
        .execute(HttpClientRequest.get(url))
        .pipe(
          Effect.mapError((failure): Refusal =>
            failure._tag === "OutboundRequestRefused"
              ? refusalOf(failure)
              : unreachable("noAnswer")
          )
        );

    // The answer the address leads to, through a few redirects at most.
    const follow = (
      url: URL,
      followed: number
    ): Effect.Effect<HttpClientResponse.HttpClientResponse, Refusal> =>
      answerFrom(url).pipe(
        Effect.flatMap((response) => {
          if (!redirects.has(response.status)) {
            return Effect.succeed(response);
          }

          if (followed === maxRedirects) {
            return Effect.fail(unreachable("tooManyRedirects"));
          }

          return Option.match(locationOf(response, url), {
            onNone: () =>
              Effect.fail(
                unreachable("badStatus", Option.some(response.status))
              ),
            onSome: (next) => follow(next, followed + 1),
          });
        })
      );

    const open = Effect.fn("RemoteMedia.open")(function* open(raw: string) {
      const url = yield* Option.match(withoutCredentials(raw), {
        onNone: () => Effect.fail(new MediaSourceNotPublic()),
        onSome: Effect.succeed,
      });

      const response = yield* follow(url, 0);

      if (response.status !== 200) {
        return yield* unreachable("badStatus", Option.some(response.status));
      }

      const bytes = response.stream.pipe(
        Stream.mapError(() => unreachable("noAnswer"))
      );

      const [first, rest] = yield* Stream.peel(bytes, Sink.head<Uint8Array>());

      const file: RemoteFile = {
        declaredSize: Headers.get(response.headers, "content-length").pipe(
          Option.flatMap(decodeSize)
        ),
        declaredType: Headers.get(response.headers, "content-type"),
        rest,
        start: Option.getOrElse(first, () => new Uint8Array()),
      };

      return file;
    });

    return RemoteMedia.of({ open });
  })
);
