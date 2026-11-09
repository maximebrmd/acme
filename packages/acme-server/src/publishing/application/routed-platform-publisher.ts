import { Effect, Layer, Option } from "effect";

import { textOn } from "#publishing/domain/post-content.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";

import { PlatformClients } from "./platform-client.ts";
import type { OutgoingPost } from "./platform-client.ts";
import { PlatformCredentials } from "./platform-credentials.ts";
import { PlatformPublisher } from "./platform-publisher.ts";
import type { PublishRequest } from "./platform-publisher.ts";
import { PostRepository } from "./post-repository.ts";

// Nothing was sent yet: the database not answering is worth trying again.
const databaseDown = (failure: DatabaseError) =>
  Effect.logWarning("Could not read a post to publish", failure).pipe(
    Effect.andThen(Effect.fail(new PlatformUnavailable()))
  );

const interrupted: PublishResult = {
  _tag: "unconfirmed",
  reason: "interrupted",
};

/**
 * The PlatformPublisher the channel gates run: it reads the post, finds the
 * channel's platform, and hands the post, as it reads on that channel, to
 * the platform's client.
 */
export const RoutedPlatformPublisher = Layer.effect(
  PlatformPublisher,
  Effect.gen(function* RoutedPlatformPublisher() {
    const posts = yield* PostRepository;
    const credentials = yield* PlatformCredentials;
    const clients = yield* PlatformClients;

    const outgoing = Effect.fn("Publishing.outgoing")(function* outgoing(
      request: PublishRequest
    ) {
      const stored = yield* posts
        .find(request.postId)
        .pipe(Effect.catchTag("DatabaseError", databaseDown));

      if (Option.isNone(stored)) {
        return yield* Effect.die(`Post ${request.postId} is missing`);
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
        startedAt: request.startedAt,
        text: textOn(post.content, request.channelId),
        workspaceId: post.workspaceId,
      };

      return { client: client.value, post: sent };
    });

    return PlatformPublisher.of({
      publish: (request) =>
        outgoing(request).pipe(
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
