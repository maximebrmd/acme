import { Context, Effect, Layer, Option } from "effect";

import type { FeedAddress } from "#publishing/domain/feed-address.ts";
import type { FeedDocument } from "#publishing/domain/feed-document.ts";
import type { FeedValidators } from "#publishing/domain/feed.ts";

import { FeedReadFailed } from "./feed-read-failed.ts";

/**
 * What a read of a feed gave: nothing new since the validators sent
 * (`notModified`), or the document, with the validators to send next.
 */
export type FeedRead =
  | { readonly _tag: "notModified" }
  | {
      readonly _tag: "read";
      readonly document: FeedDocument;
      readonly validators: FeedValidators;
    };

/**
 * Reads web feeds at the addresses members give: hosts Peal does not
 * control, so every request is checked by the outbound guard, redirects
 * included, its size and time are bounded, and it carries no credential.
 * What comes back is text Peal did not write, made storable, each item's
 * identity kept as its digest only.
 */
export class FeedSource extends Context.Service<
  FeedSource,
  {
    readonly read: (
      address: FeedAddress,
      validators: FeedValidators
    ) => Effect.Effect<FeedRead, FeedReadFailed>;
  }
>()("peal-server/publishing/application/FeedSource") {
  /** For tests that read no feed: every host is out of reach. */
  static readonly none = Layer.succeed(
    FeedSource,
    FeedSource.of({
      read: () =>
        Effect.fail(
          new FeedReadFailed({
            failure: "unreachable",
            retryAfterSeconds: Option.none(),
          })
        ),
    })
  );
}
