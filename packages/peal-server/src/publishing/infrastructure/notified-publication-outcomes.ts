import { Effect, Layer, Match, Option } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { Notify } from "#notifications/application/notify.ts";
import type { NoticeRequest } from "#notifications/application/notify.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PublicationOutcomes } from "#publishing/application/publication-outcomes.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import { DatabaseError } from "#shared/application/database-error.ts";

type NoticeEvent = NoticeRequest["event"];

type Channel = Extract<NoticeEvent, { readonly _tag: "PostFailed" }>["channel"];

// What the members who schedule posts hear about a settled target. A
// cancelled one was someone's choice: nobody needs telling.
const eventOf = (target: PostTarget, channel: Channel) => {
  const { postId } = target;

  return Match.valueTags(target.status, {
    cancelled: () => Option.none<NoticeEvent>(),
    failed: ({ reason }) =>
      Option.some<NoticeEvent>({ _tag: "PostFailed", channel, postId, reason }),
    pending: () => Option.none<NoticeEvent>(),
    published: ({ permalink }) =>
      Option.some<NoticeEvent>({
        _tag: "PostPublished",
        channel,
        permalink,
        postId,
      }),
    publishing: () => Option.none<NoticeEvent>(),
    unconfirmed: () =>
      Option.some<NoticeEvent>({ _tag: "PostUnconfirmed", channel, postId }),
  });
};

// The key of what a target's round brought: one notice per target and round.
const keyOf = (target: PostTarget) =>
  `post-target:${target.id}:${target.round}`;

/**
 * Outcomes told through the notifications context, in the transaction that
 * settled the target: the notices commit with the settlement, once, under a
 * key per target and round, so a repost is told again. They go to the post's
 * author and the members who follow every post (`recipientsOf`). The channel
 * is named as the channels context has it now, by the repository port its
 * jobs read any workspace's channel with. A round a member dealt with, by
 * confirming or reposting it, resolves its notices.
 *
 * The database failing rolls the settlement back with the notices, and the
 * step is retried. A bug in telling is logged, and never stops publishing:
 * the notices sit in a savepoint of their own, which it rolls back.
 */
export const NotifiedPublicationOutcomes = Layer.effect(
  PublicationOutcomes,
  Effect.gen(function* NotifiedPublicationOutcomes() {
    const channels = yield* ChannelRepository;
    const notices = yield* Notify;
    const posts = yield* PostRepository;

    const settled = Effect.fn("PublicationOutcomes.settled")(function* settled(
      target: PostTarget
    ) {
      const found = yield* posts.find(target.postId);

      const channel = (yield* channels.get(target.channelId)).pipe(
        Option.map(({ handle, platform }) => ({ handle, platform }))
      );

      const event = eventOf(target, channel);

      if (Option.isNone(found) || Option.isNone(event)) {
        return;
      }

      const { post } = found.value;

      yield* notices
        .notify({
          ...Option.match(post.authorId, {
            onNone: () => ({}),
            onSome: (author) => ({ author }),
          }),
          event: event.value,
          key: keyOf(target),
          workspaceId: post.workspaceId,
        })
        .pipe(
          Effect.catchTag("RecipientsUnavailable", (failure) =>
            Effect.fail(new DatabaseError({ cause: failure }))
          )
        );
    });

    return PublicationOutcomes.of({
      resolved: (target) =>
        notices
          .resolve(keyOf(target))
          .pipe(
            Effect.annotateLogs({ round: target.round, targetId: target.id })
          ),
      settled: (target) =>
        settled(target).pipe(
          Effect.catchDefect((defect) =>
            Effect.logError("A post's outcome could not be told", defect)
          ),
          Effect.annotateLogs({ round: target.round, targetId: target.id })
        ),
    });
  })
);
