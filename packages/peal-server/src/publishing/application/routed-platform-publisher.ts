import { Effect, Layer, Option, Result } from "effect";

import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { textOn } from "#publishing/domain/post-content.ts";
import type { Post } from "#publishing/domain/post.ts";
import { postingMonthOf } from "#publishing/domain/posting-month.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { withinAllowance } from "#shared/domain/allowance.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";

import { PlatformClients } from "./platform-client.ts";
import type { OutgoingPost } from "./platform-client.ts";
import { PlatformCredentials } from "./platform-credentials.ts";
import { PlatformPublisher } from "./platform-publisher.ts";
import type { PublishRequest } from "./platform-publisher.ts";
import { PostAllowance } from "./post-allowance.ts";
import { PostRepository } from "./post-repository.ts";

// Nothing was sent yet: the database not answering is worth trying again.
const databaseDown = (failure: DatabaseError) =>
  Effect.logWarning("Could not read a post to publish", failure).pipe(
    Effect.andThen(Effect.fail(new PlatformUnavailable()))
  );

const overPlan = new BadRequest({ code: ownRefusalCodes.planLimit });

// When the post was due: the time it was scheduled for.
const dueAt = (post: Post) =>
  post.status._tag === "publishing" ||
  post.status._tag === "finished" ||
  post.status._tag === "scheduled"
    ? Option.some(post.status.schedule.at)
    : Option.none();

const interrupted: PublishResult = {
  _tag: "unconfirmed",
  reason: "interrupted",
};

/**
 * The PlatformPublisher the channel gates run: it reads the post and its
 * target, finds the channel's platform, and hands the post, as it reads on
 * that channel and with the target's options, to the platform's client.
 * Before a post goes out, the workspace's plan must have room for it now,
 * not only when it was scheduled, as a trial or a larger plan may have
 * ended since: a workspace with more channels than its plan allows sends
 * nothing, and of the posts due in a month only the first its plan allows
 * go out, by their time. The others fail as `planLimit`, nothing sent. A
 * run resumed may have gone out already, and is checked no further.
 */
export const RoutedPlatformPublisher = Layer.effect(
  PlatformPublisher,
  Effect.gen(function* RoutedPlatformPublisher() {
    const posts = yield* PostRepository;
    const credentials = yield* PlatformCredentials;
    const clients = yield* PlatformClients;
    const allowance = yield* PostAllowance;

    const withinPlan = Effect.fn("Publishing.withinPlan")(function* withinPlan(
      post: Post
    ) {
      const channels = yield* allowance.channels(post.workspaceId);

      if (
        Result.isFailure(
          withinAllowance("channels", channels.allowed, channels.connected)
        )
      ) {
        yield* overPlan;
      }

      const allowed = yield* allowance.scheduledPerMonth(post.workspaceId);
      const at = dueAt(post);

      if (Option.isSome(allowed) && Option.isSome(at)) {
        const before = yield* posts.countGoingOutBefore(
          post.workspaceId,
          postingMonthOf(at.value),
          { at: at.value, postId: post.id }
        );

        if (before >= allowed.value) {
          yield* overPlan;
        }
      }
    });

    const outgoing = Effect.fn("Publishing.outgoing")(function* outgoing(
      request: PublishRequest
    ) {
      const { stored, target } = yield* Effect.all({
        stored: posts.find(request.postId),
        target: posts.findTarget(request.targetId),
      }).pipe(Effect.catchTag("DatabaseError", databaseDown));

      if (Option.isNone(stored)) {
        return yield* Effect.die(`Post ${request.postId} is missing`);
      }

      if (Option.isNone(target)) {
        return yield* Effect.die(`Target ${request.targetId} is missing`);
      }

      const account = yield* credentials.account(request.channelId);
      const client = clients.for(account.platform);

      if (Option.isNone(client)) {
        return yield* new BadRequest({ code: "platformNotSupported" });
      }

      const { post } = stored.value;

      const sent: OutgoingPost = {
        accountId: account.accountId,
        channelId: request.channelId,
        idempotencyKey: request.idempotencyKey,
        media: post.content.media,
        options: target.value.options,
        startedAt: request.startedAt,
        text: textOn(post.content, request.channelId),
        workspaceId: post.workspaceId,
      };

      return { client: client.value, post: sent, stored: post };
    });

    return PlatformPublisher.of({
      publish: (request) =>
        outgoing(request).pipe(
          Effect.tap(({ stored }) =>
            withinPlan(stored).pipe(
              Effect.catchTag("DatabaseError", databaseDown)
            )
          ),
          Effect.flatMap(({ client, post }) => client.publish(post))
        ),
      // Without the post or its channel, the earlier run cannot be checked.
      resume: (request) =>
        outgoing(request).pipe(
          Effect.matchEffect({
            onFailure: () => Effect.succeed(interrupted),
            onSuccess: ({ client, post }) => client.resume(post),
          })
        ),
    });
  })
);
