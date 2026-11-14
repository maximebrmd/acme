import { DateTime, Effect, Layer, Option } from "effect";

import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { livePartsOf } from "#publishing/domain/post-target.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import {
  storableFailure,
  storableResult,
} from "#publishing/domain/storable-outcome.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { MeterClaim } from "#shared/application/metered-usage.ts";
import type { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import type {
  PlatformPostId,
  PublishResult,
} from "#shared/domain/publish-result.ts";

import { FollowUpPublisher } from "./follow-up-publisher.ts";
import type { FollowUpRequest } from "./follow-up-publisher.ts";
import { FollowUpStore } from "./follow-up-store.ts";
import { PlatformClients } from "./platform-client.ts";
import type { OutgoingPost } from "./platform-client.ts";
import { PlatformCredentials } from "./platform-credentials.ts";
import { PlatformReposts } from "./platform-reposts.ts";
import { PostMeter } from "./post-meter.ts";
import { PostRepository } from "./post-repository.ts";
import { meterCodes } from "./routed-platform-publisher.ts";
import { CurrentThreadedPlatforms } from "./threaded-platforms.ts";

// Nothing was sent yet: the database not answering is worth trying again.
const databaseDown = (failure: DatabaseError) =>
  Effect.logWarning("Could not read a follow-up to send", failure).pipe(
    Effect.andThen(Effect.fail(new PlatformUnavailable()))
  );

const interrupted: PublishResult = {
  _tag: "unconfirmed",
  reason: "interrupted",
};

const noReplyTarget = new BadRequest({
  code: ownRefusalCodes.replyTargetUnknown,
});

// The post the follow-up answers or reposts: its first part, and the last
// part that went live, as the platform named them. A part found by hand
// has no id anyone can answer.
const livePartsIds = (
  target: PostTarget
): Effect.Effect<
  { readonly last: PlatformPostId; readonly root: PlatformPostId },
  BadRequest
> => {
  const parts = livePartsOf(target);
  const root = parts[0]?.platformPostId ?? Option.none();
  const last = parts.at(-1)?.platformPostId ?? Option.none();

  return Option.isSome(root) && Option.isSome(last)
    ? Effect.succeed({ last: last.value, root: root.value })
    : Effect.fail(noReplyTarget);
};

// What the platform answered, as it is kept.
const storable = <R>(
  call: Effect.Effect<PublishResult, PublishFailure, R>
): Effect.Effect<PublishResult, PublishFailure, R> =>
  call.pipe(Effect.map(storableResult), Effect.mapError(storableFailure));

/**
 * The FollowUpPublisher the channel gates run: it claims the call (none
 * for a follow-up no longer on its way), reads the follow-up, its rule's
 * text and its target, and hands it to the platform: a comment to the
 * platform's client as the next part of the post would go (the account's
 * own reply to the last part live, naming the first: so it reads as the
 * thread's next part, and an adapter's lookup by its key finds it on a
 * resume), a repost to the platform's repost client. Its key is the
 * follow-up's id, and its start when its call set out. A comment on a
 * platform that bills per post (X) is claimed on the billing account's
 * meter first, given back when the platform refuses it.
 */
export const RoutedFollowUpPublisher = Layer.effect(
  FollowUpPublisher,
  Effect.gen(function* RoutedFollowUpPublisher() {
    const store = yield* FollowUpStore;
    const posts = yield* PostRepository;
    const credentials = yield* PlatformCredentials;
    const clients = yield* PlatformClients;
    const reposts = yield* PlatformReposts;
    const threaded = yield* CurrentThreadedPlatforms;
    const meter = yield* PostMeter;

    const prepared = Effect.fn("FollowUps.prepared")(function* prepared(
      request: FollowUpRequest
    ) {
      const read = yield* Effect.all({
        followUp: store.followUp(request.followUpId),
        now: DateTime.now,
      }).pipe(Effect.catchTag("DatabaseError", databaseDown));

      const { followUp, now } = read;

      if (Option.isNone(followUp) || followUp.value.status._tag !== "sending") {
        return yield* new PlatformUnavailable();
      }

      const found = followUp.value;
      const { attemptedAt } = followUp.value.status;

      const { rule, target } = yield* Effect.all({
        rule: store.rule(found.workspaceId, found.ruleId),
        target: posts.findTarget(found.targetId),
      }).pipe(Effect.catchTag("DatabaseError", databaseDown));

      if (Option.isNone(rule) || Option.isNone(target)) {
        return yield* new BadRequest({ code: "followUpGone" });
      }

      const account = yield* credentials.account(request.channelId);
      const ids = yield* livePartsIds(target.value);

      return {
        account,
        followUp: found,
        ids,
        rule: rule.value,
        startedAt: Option.getOrElse(attemptedAt, () => now),
        target: target.value,
      };
    });

    type Prepared = Effect.Success<ReturnType<typeof prepared>>;

    const commentOf = ({
      account,
      followUp,
      ids,
      rule,
      startedAt,
      target,
    }: Prepared): Effect.Effect<OutgoingPost, BadRequest> =>
      Option.match(rule.comment, {
        onNone: () => Effect.fail(new BadRequest({ code: "followUpGone" })),
        onSome: (text) =>
          Effect.succeed({
            accountId: account.accountId,
            channelId: followUp.channelId,
            idempotencyKey: followUp.id,
            media: [],
            options: target.options,
            part: livePartsOf(target).length,
            poll: Option.none(),
            replyTo: Option.some({ parent: ids.last, root: ids.root }),
            startedAt,
            text,
            workspaceId: followUp.workspaceId,
          }),
      });

    const repostOf = ({ account, followUp, ids, startedAt }: Prepared) => ({
      accountId: account.accountId,
      channelId: followUp.channelId,
      idempotencyKey: followUp.id,
      platformPostId: ids.root,
      startedAt,
      workspaceId: followUp.workspaceId,
    });

    const notSupported = new BadRequest({
      code: ownRefusalCodes.partsNotSupported,
    });

    // Sends the comment, claimed first where the platform bills per post.
    const sendComment = Effect.fn("FollowUps.sendComment")(
      function* sendComment(ready: Prepared) {
        const { platform } = ready.account;
        const client = clients.for(platform);

        if (Option.isNone(client) || !threaded.takesParts(platform)) {
          return yield* notSupported;
        }

        const post = yield* commentOf(ready);

        const claim = yield* meter
          .claim({ platform, text: post.text, workspaceId: post.workspaceId })
          .pipe(
            Effect.catchTags({
              AllowanceReached: (reached: AllowanceReached) =>
                Effect.fail(
                  new BadRequest({ code: meterCodes[reached.reason] })
                ),
              DatabaseError: databaseDown,
            })
          );

        const giveBack = (given: MeterClaim) =>
          meter
            .giveBack(given)
            .pipe(
              Effect.catchTag("DatabaseError", (failure) =>
                Effect.logWarning(
                  "Could not give back a follow-up the platform refused",
                  failure
                )
              )
            );

        return yield* client.value.publish(post).pipe(
          Effect.tapError(() =>
            Option.match(claim, {
              onNone: () => Effect.void,
              onSome: giveBack,
            })
          )
        );
      }
    );

    const send = (request: FollowUpRequest) =>
      Effect.gen(function* sending() {
        const claimed = yield* store
          .claimCall(request.followUpId, yield* DateTime.now)
          .pipe(Effect.catchTag("DatabaseError", databaseDown));

        // Settled or handed over while the call waited its turn.
        if (!claimed) {
          return yield* new PlatformUnavailable();
        }

        const ready = yield* prepared(request);

        if (ready.followUp.kind === "comment") {
          return yield* sendComment(ready);
        }

        const client = reposts.for(ready.account.platform);

        if (Option.isNone(client)) {
          return yield* notSupported;
        }

        return yield* client.value.repost(repostOf(ready));
      }).pipe(storable);

    // Without the follow-up or its channel, the earlier run cannot be
    // checked: it may be out.
    const resume = (request: FollowUpRequest) =>
      prepared(request).pipe(
        Effect.flatMap((ready) => {
          if (ready.followUp.kind === "comment") {
            const client = clients.for(ready.account.platform);

            return Option.isNone(client)
              ? Effect.succeed(interrupted)
              : commentOf(ready).pipe(Effect.flatMap(client.value.resume));
          }

          const client = reposts.for(ready.account.platform);

          return Option.isNone(client)
            ? Effect.succeed(interrupted)
            : client.value.resume(repostOf(ready));
        }),
        Effect.catch(() => Effect.succeed(interrupted)),
        storable
      );

    return FollowUpPublisher.of({ resume, send });
  })
);
