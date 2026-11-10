import { DateTime, Duration, Effect, Option, Result } from "effect";

import { partsOn } from "#publishing/domain/post-content.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import { nextPartOf, recordLivePart } from "#publishing/domain/post-target.ts";
import type {
  PartRecord,
  PartsClaim,
} from "#publishing/domain/publication-claims.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Published } from "#shared/domain/publish-result.ts";

import { claimTargetRun } from "./post-publication.ts";
import { PostRepository } from "./post-repository.ts";

// The steps of publishing a post part by part, beside those of
// `./post-publication.ts`, which they build on: a target is claimed with the
// parts it still has to send, and each part that goes live is recorded on
// it before the next one is sent.

/**
 * A target's job started for `round`: start sending it if it is still
 * pending in that round, with the parts left to send, in order, or say why
 * not. The parts are those after the last that went live, so a round that
 * follows a failed or unconfirmed part starts there, and each comes with
 * the wait before it; the first of them goes at once, as the round was
 * asked for now.
 */
export const claimPartsRun = Effect.fn("Publishing.claimParts")(
  function* claimPartsRun(targetId: PostTargetId, round: number) {
    const posts = yield* PostRepository;
    const { transaction } = yield* TransactionRunner;

    return yield* transaction(
      Effect.gen(function* claimInTransaction() {
        const claim = yield* claimTargetRun(targetId, round);

        if (claim._tag !== "claimed") {
          const other: PartsClaim = claim;

          return other;
        }

        const stored = yield* posts.find(claim.postId);
        const target = yield* posts.findTarget(targetId);

        if (Option.isNone(stored) || Option.isNone(target)) {
          return yield* Effect.die("A claimed target or its post is missing");
        }

        const from = nextPartOf(target.value);

        const parts = partsOn(stored.value.post.content, claim.channelId)
          .filter(({ index }) => index >= from)
          .map(({ delay, index }) => ({
            delay: index === from ? Duration.zero : delay,
            index,
          }));

        const claimed: PartsClaim = { ...claim, parts };

        return claimed;
      })
    );
  }
);

/**
 * The part at `index` went live in `round`: it is recorded on the target,
 * once, so the next part knows what it answers to and a later round where
 * to start. Answers when it was recorded, from which the next part's wait
 * counts, or that the target is no longer this round's to send.
 */
export const recordPartRun = Effect.fn("Publishing.recordPart")(
  function* recordPartRun(
    targetId: PostTargetId,
    round: number,
    index: number,
    published: Published
  ) {
    const posts = yield* PostRepository;
    const { transaction } = yield* TransactionRunner;

    return yield* transaction(
      Effect.gen(function* recordInTransaction() {
        const locked = yield* posts.lockTarget(targetId);
        const now = yield* DateTime.now;

        if (
          Option.isNone(locked) ||
          locked.value.round !== round ||
          locked.value.status._tag !== "publishing"
        ) {
          const superseded: PartRecord = { _tag: "superseded" };

          return superseded;
        }

        const target = locked.value;

        // An earlier run recorded it: the next part waits from then.
        const known = target.liveParts[index];

        if (known !== undefined) {
          const again: PartRecord = {
            _tag: "recorded",
            at: known.publishedAt,
          };

          return again;
        }

        const next = yield* Result.match(
          recordLivePart(target, {
            index,
            permalink: Option.fromUndefinedOr(published.permalink),
            platformPostId: Option.some(published.platformPostId),
            publishedAt: now,
            round,
          }),
          { onFailure: Effect.die, onSuccess: Effect.succeed }
        );

        if (!(yield* posts.updateTarget(next, target))) {
          return yield* Effect.die("A target changed under its lock");
        }

        const recorded: PartRecord = { _tag: "recorded", at: now };

        return recorded;
      })
    );
  }
);
