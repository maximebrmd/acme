import { Effect, Option, Result } from "effect";
import type {
  CurrentMember,
  NewPost as NewPostInput,
  PostRefusal,
} from "peal-contract";

import type { PostBatches } from "#publishing/application/post-batches.ts";
import type {
  SendPostRequest,
  SentPost,
} from "#publishing/application/post-scheduling.ts";
import type { ImportedPost } from "#publishing/domain/post-import.ts";
import type { LimitRefusal } from "#shared/api/limit-reached.ts";
import type { Actor } from "#shared/domain/access.ts";

import { sendRequestFrom } from "./post-input.ts";
import { refusalOf } from "./post-refusal.ts";

// Several posts in one request: each read on its own, and those that could
// be read sent in order.

const nul = String.fromCodePoint(0);

/**
 * The idempotency key of one post of several: its own, or the request's
 * with the post's place in it. A header cannot hold a NUL, and a key an
 * item, a row or a tool's argument gives is refused with one (the
 * contract's schemas, the import's cells), so a key made here is never one
 * a client chose for something else.
 */
export const keyAt = (
  own: string | undefined,
  shared: string | undefined,
  kind: "bulk" | "import",
  place: number
): string | undefined =>
  own ?? (shared === undefined ? undefined : [shared, kind, place].join(nul));

/** A post of several, read: the request to send, or why it cannot be. */
export type ReadPost = Result.Result<SendPostRequest, PostRefusal>;

/** A post as the contract writes one, with its key, read on its own. */
export const readPost = (
  input: NewPostInput,
  key: string | undefined
): Effect.Effect<ReadPost> =>
  sendRequestFrom(input, key).pipe(
    Effect.match({
      onFailure: (refusal): ReadPost => Result.fail(refusal),
      onSuccess: (request): ReadPost => Result.succeed(request),
    })
  );

/**
 * The post a CSV row wrote, as the contract writes one. What its
 * `channels` cell lists is a channel's id, or one of the workspace's
 * channel sets (`sets`: those of the file's entries that name one, by id
 * or by name).
 */
export const newPostOf = (
  post: ImportedPost,
  sets: ReadonlySet<string> = new Set()
): NewPostInput => ({
  allowDuplicate: post.allowDuplicate,
  channelIds: post.channels.filter((entry) => !sets.has(entry)),
  channelSets: post.channels.filter((entry) => sets.has(entry)),
  content: {
    media: post.media.map((mediaId) => ({ altText: "", mediaId })),
    overrides: [],
    text: post.text,
  },
  when: Option.match(post.at, {
    onNone: () => ({ _tag: "now" as const, timeZone: post.timeZone }),
    onSome: (at) => ({ _tag: "at" as const, at, timeZone: post.timeZone }),
  }),
});

/**
 * Sends the posts that could be read, in order, and answers what became
 * of each one read or not, in their order.
 */
export const sendRead = (
  batches: PostBatches["Service"],
  limitReached: LimitRefusal,
  actor: Actor,
  read: readonly ReadPost[]
): Effect.Effect<
  readonly Result.Result<SentPost, PostRefusal>[],
  Effect.Error<ReturnType<PostBatches["Service"]["send"]>>,
  CurrentMember
> =>
  Effect.gen(function* sending() {
    const outcomes = yield* batches.send(
      actor,
      read.flatMap((post) => (Result.isSuccess(post) ? [post.success] : []))
    );

    const toRefusal = refusalOf(limitReached);
    const answered: Result.Result<SentPost, PostRefusal>[] = [];
    let next = 0;

    for (const post of read) {
      if (Result.isFailure(post)) {
        answered.push(Result.fail(post.failure));
      } else {
        const outcome = outcomes[next];

        next += 1;

        if (outcome === undefined) {
          return yield* Effect.die("A post of a batch has no outcome");
        }

        answered.push(
          Result.isSuccess(outcome)
            ? Result.succeed(outcome.success)
            : Result.fail(yield* toRefusal(outcome.failure))
        );
      }
    }

    return answered;
  });
