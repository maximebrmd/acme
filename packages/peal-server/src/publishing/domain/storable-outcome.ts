import { Option, Schema } from "effect";

import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { storableLine } from "#shared/domain/platform-text.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";

// What a platform answers a publishing call with is kept: the post's id
// and address in the post's rows, a refusal's code in its journal, and all
// of it in the job's history. Each is the platform's own text, made
// storable and bounded here, where it enters, so no answer can fail a
// write that records how a post went.

const maxPostIdLength = 512;
const maxPermalinkLength = 2048;
const maxCodeLength = 200;

const decodePostId = Schema.decodeUnknownOption(PlatformPostIdSchema);

// An address a browser opens on the web, short enough to be one.
const webAddress = (address: string): Option.Option<string> => {
  const cleaned = storableLine(address, maxPermalinkLength + 1);

  return cleaned.length <= maxPermalinkLength &&
    /^https?:\/\/\S+$/u.test(cleaned)
    ? Option.some(cleaned)
    : Option.none();
};

/**
 * A call's result as it is kept. A post the platform made, under an id
 * that cleans to nothing, is live and cannot be read back: its outcome is
 * not confirmed, never taken for a refusal.
 */
export const storableResult = (result: PublishResult): PublishResult => {
  if (result._tag !== "published") {
    return result;
  }

  const { permalink: _address, platformPostId: _id, ...rest } = result;

  return Option.match(
    decodePostId(storableLine(result.platformPostId, maxPostIdLength)),
    {
      onNone: (): PublishResult => ({
        _tag: "unconfirmed",
        reason: "unreadableResponse",
      }),
      onSome: (platformPostId): PublishResult => ({
        ...rest,
        ...Option.match(
          Option.fromUndefinedOr(result.permalink).pipe(
            Option.flatMap(webAddress)
          ),
          { onNone: () => ({}), onSome: (permalink) => ({ permalink }) }
        ),
        platformPostId,
      }),
    }
  );
};

/** A refusal as it is kept: its code one bounded line. */
export const storableFailure = (failure: PublishFailure): PublishFailure => {
  if (failure._tag === "BadRequest") {
    return new BadRequest({ code: storableLine(failure.code, maxCodeLength) });
  }

  if (failure._tag === "MediaRejected") {
    return new MediaRejected({
      code: storableLine(failure.code, maxCodeLength),
    });
  }

  if (failure._tag !== "RateLimited" || failure.code === undefined) {
    return failure;
  }

  const code = storableLine(failure.code, maxCodeLength);

  return failure.retryAfter === undefined
    ? new RateLimited({ code })
    : new RateLimited({ code, retryAfter: failure.retryAfter });
};
