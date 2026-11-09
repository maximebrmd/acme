import { DateTime, Duration, Effect, Option, Result } from "effect";

import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import type {
  Published,
  PublishResult,
  UnconfirmedReason,
} from "#shared/domain/publish-result.ts";

import type { OutcomeUnknown } from "./outcome-unknown.ts";
import type { OutgoingPost, PlatformClient } from "./platform-client.ts";

/** Where the media of a prepared post stands on the platform. */
export type Readiness<P> =
  | { readonly _tag: "ready"; readonly prepared: P }
  // The platform is still processing it: ask again after `pollAfter`.
  | {
      readonly _tag: "processing";
      readonly pollAfter: Duration.Duration;
      readonly prepared: P;
    };

/** What reading an attempt's post back on the platform found. */
export type LookUp =
  | { readonly _tag: "found"; readonly published: Published }
  // The platform answered that it has no such post.
  | { readonly _tag: "absent" }
  // No answer settled it.
  | { readonly _tag: "unknown" };

/**
 * How a platform tells whether an attempt's post went out:
 *
 * - `lookUp`: the post is read back by a key chosen before it was sent,
 *   which the platform never takes twice (Bluesky's record key), or by what
 *   `prepare` made of it when the run still has it (a Meta container, which
 *   is published once at most). The answer `absent` must be definite:
 *   sending again then posts at most once. Without a key, as when resuming
 *   a run, an adapter that cannot tell answers `unknown`.
 * - `resend`: sending the post again with the attempt's idempotency key
 *   answers with the post that key made, or makes it once, for `window`
 *   after the attempt started (Mastodon keeps keys for an hour).
 */
export type Confirmation<P = never> =
  | {
      readonly _tag: "lookUp";
      readonly lookUp: (
        post: OutgoingPost,
        prepared: Option.Option<P>
      ) => Effect.Effect<LookUp, PublishFailure>;
    }
  | { readonly _tag: "resend"; readonly window: Duration.Duration };

/**
 * Publishing on a platform, in four steps. `prepare` uploads the media, and
 * may run again: media alone shows nowhere. `poll` asks whether the platform
 * has processed it. `commit` is the one request that makes the post live: a
 * failure means it did not, OutcomeUnknown that it may have. `confirmation`
 * says how the platform reads the post back.
 */
export interface PublicationSteps<P> {
  readonly commit: (
    post: OutgoingPost,
    prepared: P
  ) => Effect.Effect<Published, OutcomeUnknown | PublishFailure>;
  readonly confirmation: Confirmation<P>;
  readonly platform: Platform;
  readonly poll: (
    post: OutgoingPost,
    prepared: P
  ) => Effect.Effect<Readiness<P>, PublishFailure>;
  readonly prepare: (
    post: OutgoingPost
  ) => Effect.Effect<Readiness<P>, PublishFailure>;
}

/** How long the steps wait. */
export interface StepTiming {
  /** The wait before each confirmation, after an unknown outcome. */
  readonly confirmDelays: readonly Duration.Duration[];
  /** The longest wait between two looks at media being processed. */
  readonly longestPoll: Duration.Duration;
  /**
   * The longest the platform may take to process the media. Past it the
   * attempt ends as unavailable, which a later attempt tries again.
   */
  readonly processingLimit: Duration.Duration;
}

/**
 * Three confirmations, over about two and a half minutes: long enough for a
 * platform that was slow to answer to have recorded the post, short enough
 * to stay inside Mastodon's hour.
 */
export const defaultStepTiming: StepTiming = {
  confirmDelays: [
    Duration.seconds(5),
    Duration.seconds(30),
    Duration.minutes(2),
  ],
  longestPoll: Duration.minutes(1),
  processingLimit: Duration.minutes(15),
};

// What one confirmation came to.
type Round =
  // The post was found, or a definite answer came back.
  | {
      readonly _tag: "settled";
      readonly result: Result.Result<PublishResult, PublishFailure>;
    }
  // Nothing settled it yet: try again after the next wait.
  | { readonly _tag: "unsettled" }
  // Nothing can settle it any more.
  | { readonly _tag: "stop" };

const settled = (
  result: Result.Result<PublishResult, PublishFailure>
): Round => ({ _tag: "settled", result });

const unsettled: Round = { _tag: "unsettled" };

const stop: Round = { _tag: "stop" };

const unconfirmed = (reason: UnconfirmedReason): PublishResult => ({
  _tag: "unconfirmed",
  reason,
});

// A refusal of a post sent again with the attempt's key, or after the
// platform said it had no such post: the platform decided on the post
// itself, so nothing went live. Other refusals (a rate limit, a token, an
// outage) come before that decision, and settle nothing.
const isDefinite = (failure: PublishFailure): boolean =>
  failure._tag === "BadRequest" || failure._tag === "MediaRejected";

// A post sent again and refused, or not answered.
const roundAfterRefusal = (
  refusal: OutcomeUnknown | PublishFailure
): Effect.Effect<Round> =>
  Effect.succeed(
    refusal._tag !== "OutcomeUnknown" && isDefinite(refusal)
      ? settled(Result.fail(refusal))
      : unsettled
  );

// Whether the attempt started less than `window` ago.
const isWithinWindow = (post: OutgoingPost, window: Duration.Duration) =>
  DateTime.now.pipe(
    Effect.map((now) =>
      Duration.isLessThan(DateTime.distance(post.startedAt, now), window)
    )
  );

/**
 * The PlatformClient that runs a platform's steps: prepare, wait for the
 * media, commit, and confirm an unknown outcome as the platform allows,
 * a few times, before answering unconfirmed. A post is sent again only
 * where the platform makes it harmless.
 */
export const sequenced = <P>(
  steps: PublicationSteps<P>,
  timing: StepTiming = defaultStepTiming
): PlatformClient => {
  const { confirmation, platform } = steps;

  const logged = (post: OutgoingPost) =>
    Effect.annotateLogs({ channelId: post.channelId, platform });

  // Prepares the post and waits until the platform has processed its media.
  const ready = Effect.fn(`Publishing.${platform}.ready`)(function* ready(
    post: OutgoingPost
  ) {
    let readiness = yield* steps.prepare(post);
    let waited = Duration.zero;

    while (readiness._tag === "processing") {
      // Counted in the waits the platform asks for, even when shortened.
      waited = Duration.sum(waited, readiness.pollAfter);

      if (Duration.isGreaterThan(waited, timing.processingLimit)) {
        yield* Effect.logWarning(
          "The platform took too long to process a post's media"
        ).pipe(logged(post));

        return yield* new PlatformUnavailable();
      }

      yield* Effect.sleep(
        Duration.min(readiness.pollAfter, timing.longestPoll)
      );
      readiness = yield* steps.poll(post, readiness.prepared);
    }

    return readiness.prepared;
  });

  // Sends the post again, where that cannot post it twice.
  const resend = (post: OutgoingPost, prepared: P): Effect.Effect<Round> =>
    steps.commit(post, prepared).pipe(
      Effect.map((published) => settled(Result.succeed(published))),
      Effect.catch(roundAfterRefusal)
    );

  const confirmOnce = (post: OutgoingPost, prepared: P): Effect.Effect<Round> =>
    confirmation._tag === "lookUp"
      ? confirmation.lookUp(post, Option.some(prepared)).pipe(
          Effect.orElseSucceed((): LookUp => ({ _tag: "unknown" })),
          Effect.flatMap((found) => {
            if (found._tag === "found") {
              return Effect.succeed(settled(Result.succeed(found.published)));
            }

            return found._tag === "absent"
              ? resend(post, prepared)
              : Effect.succeed(unsettled);
          })
        )
      : isWithinWindow(post, confirmation.window).pipe(
          Effect.flatMap((within) =>
            within ? resend(post, prepared) : Effect.succeed(stop)
          )
        );

  // The commit's outcome is unknown: confirm it, waiting before each try.
  const confirmAfter = Effect.fn(`Publishing.${platform}.confirm`)(
    function* confirmAfter(
      post: OutgoingPost,
      prepared: P,
      reason: UnconfirmedReason
    ) {
      for (const delay of timing.confirmDelays) {
        yield* Effect.sleep(delay);

        const round = yield* confirmOnce(post, prepared);

        if (round._tag === "settled") {
          return yield* Effect.fromResult(round.result);
        }

        if (round._tag === "stop") {
          break;
        }
      }

      yield* Effect.logWarning(
        "Whether a post went live could not be confirmed"
      ).pipe(logged(post));

      return unconfirmed(reason);
    }
  );

  const commitConfirmed = (
    post: OutgoingPost,
    prepared: P
  ): Effect.Effect<PublishResult, PublishFailure> =>
    steps
      .commit(post, prepared)
      .pipe(
        Effect.catchTag("OutcomeUnknown", ({ reason }) =>
          confirmAfter(post, prepared, reason)
        )
      );

  const publish = (post: OutgoingPost) =>
    ready(post).pipe(
      Effect.flatMap((prepared) => commitConfirmed(post, prepared)),
      Effect.withSpan(`Publishing.${platform}.publish`)
    );

  const interrupted = unconfirmed("interrupted");

  // Sends the post again with the attempt's key. Anything that fails before
  // the platform decides on the post says nothing of the earlier run. The
  // media is uploaded and processed again first, which takes time: the key
  // must still hold when the post is sent, not only when the resume began.
  const resendResumed = (
    post: OutgoingPost,
    window: Duration.Duration
  ): Effect.Effect<PublishResult, PublishFailure> =>
    ready(post).pipe(
      Effect.matchEffect({
        onFailure: () => Effect.succeed(interrupted),
        onSuccess: (prepared) =>
          isWithinWindow(post, window).pipe(
            Effect.flatMap((within) =>
              within
                ? steps.commit(post, prepared).pipe(
                    Effect.map((published): PublishResult => published),
                    Effect.catchTag("OutcomeUnknown", () =>
                      confirmAfter(post, prepared, "interrupted")
                    ),
                    Effect.catchIf(
                      (refusal) => !isDefinite(refusal),
                      () => Effect.succeed(interrupted)
                    )
                  )
                : Effect.succeed(interrupted)
            )
          ),
      })
    );

  const resume = (
    post: OutgoingPost
  ): Effect.Effect<PublishResult, PublishFailure> =>
    (confirmation._tag === "lookUp"
      ? confirmation.lookUp(post, Option.none()).pipe(
          Effect.orElseSucceed((): LookUp => ({ _tag: "unknown" })),
          Effect.flatMap(
            (found): Effect.Effect<PublishResult, PublishFailure> => {
              if (found._tag === "found") {
                return Effect.succeed(found.published);
              }

              // Not there: the earlier run never made it, and the key keeps
              // this one from making it twice.
              return found._tag === "absent"
                ? publish(post)
                : Effect.succeed(interrupted);
            }
          )
        )
      : isWithinWindow(post, confirmation.window).pipe(
          Effect.flatMap((within) =>
            within
              ? resendResumed(post, confirmation.window)
              : Effect.succeed(interrupted)
          )
        )
    ).pipe(Effect.withSpan(`Publishing.${platform}.resume`));

  return { platform, publish, resume };
};
