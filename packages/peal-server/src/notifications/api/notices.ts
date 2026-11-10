import { Effect, Match, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentPrincipal,
  defaultNoticePageSize,
  Forbidden,
} from "peal-contract";
import type {
  Notice as NoticeView,
  NoticeChannel as NoticeChannelView,
  NoticeEvent as NoticeEventView,
  NotificationPreferences as PreferencesView,
  Principal,
} from "peal-contract";

import { NoticeInbox } from "#notifications/application/notice-inbox.ts";
import { NotificationSettings } from "#notifications/application/notification-settings.ts";
import { InboxReader } from "#notifications/domain/inbox-reader.ts";
import type {
  NoticeChannel,
  NoticeEvent,
} from "#notifications/domain/notice-event.ts";
import { NoticeIdSchema } from "#notifications/domain/notice-id.ts";
import type { Notice } from "#notifications/domain/notice.ts";
import type { NotificationPreferences } from "#notifications/domain/notification-preferences.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";

const decodeNoticeId = Schema.decodeUnknownOption(NoticeIdSchema);

const forbidden = () => Effect.fail(new Forbidden());

/**
 * Who reads the inbox: a user, impersonated or through an OAuth client. An
 * API key belongs to a workspace, not to anyone, and has no inbox.
 */
const readerOf = (principal: Principal) =>
  principal._tag === "user"
    ? Effect.succeed(
        new InboxReader({
          impersonated: principal.impersonatedBy !== null,
          oauth: Option.fromUndefinedOr(principal.oauth).pipe(
            Option.map(({ scopes, workspaceId }) => ({
              boundToWorkspace: workspaceId !== null,
              scopes,
            }))
          ),
          userId: UserIdSchema.make(principal.userId),
        })
      )
    : forbidden();

const currentReader = Effect.gen(function* currentReader() {
  return yield* readerOf(yield* CurrentPrincipal);
});

const channelView = (channel: NoticeChannel): NoticeChannelView => ({
  handle: channel.handle,
  platform: channel.platform,
});

const postChannelView = (channel: Option.Option<NoticeChannel>) =>
  channel.pipe(Option.map(channelView), Option.getOrNull);

const eventView = (event: NoticeEvent): NoticeEventView =>
  Match.valueTags(event, {
    ChannelReconnectRequired: ({ channel }): NoticeEventView => ({
      _tag: "ChannelReconnectRequired",
      channel: channelView(channel),
    }),
    ChannelReconnectSoon: ({ channel, expiresAt }): NoticeEventView => ({
      _tag: "ChannelReconnectSoon",
      channel: channelView(channel),
      expiresAt,
    }),
    PostFailed: ({ channel, postId, reason }): NoticeEventView => ({
      _tag: "PostFailed",
      channel: postChannelView(channel),
      postId,
      reason,
    }),
    PostPublished: ({ channel, permalink, postId }): NoticeEventView => ({
      _tag: "PostPublished",
      channel: postChannelView(channel),
      permalink: Option.getOrNull(permalink),
      postId,
    }),
    PostUnconfirmed: ({ channel, postId }): NoticeEventView => ({
      _tag: "PostUnconfirmed",
      channel: postChannelView(channel),
      postId,
    }),
    SubscriptionCancelled: ({ endsAt, plan }): NoticeEventView => ({
      _tag: "SubscriptionCancelled",
      endsAt,
      plan,
    }),
    SubscriptionRenewing: ({ plan, price, renewsAt }): NoticeEventView => ({
      _tag: "SubscriptionRenewing",
      plan,
      price,
      renewsAt,
    }),
    SubscriptionStarted: ({
      interval,
      plan,
      price,
      startedAt,
      trialEnd,
    }): NoticeEventView => ({
      _tag: "SubscriptionStarted",
      interval,
      plan,
      price,
      startedAt,
      trialEnd: Option.getOrNull(trialEnd),
    }),
    SubscriptionWithdrawn: ({
      plan,
      refunded,
      withdrawnAt,
    }): NoticeEventView => ({
      _tag: "SubscriptionWithdrawn",
      plan,
      refunded,
      withdrawnAt,
    }),
    TrialEnding: ({ endsAt, over, plan }): NoticeEventView => ({
      _tag: "TrialEnding",
      endsAt,
      over,
      plan,
    }),
    WebhookEndpointDisabled: ({
      endpointId,
      host,
      reason,
    }): NoticeEventView => ({
      _tag: "WebhookEndpointDisabled",
      endpointId,
      host,
      reason,
    }),
  });

const noticeView = (notice: Notice): NoticeView => ({
  createdAt: notice.createdAt,
  event: eventView(notice.event),
  id: notice.id,
  readAt: Option.getOrNull(notice.readAt),
  workspaceId: notice.workspaceId,
});

const preferencesView = (
  preferences: NotificationPreferences
): PreferencesView => ({
  email: { ...preferences.email },
  everyPost: preferences.everyPost,
});

const denied = { InboxAccessDenied: forbidden };

export const NoticesHandlers = HttpApiBuilder.group(
  Api,
  "notices",
  Effect.fn(function* noticesHandlers(handlers) {
    const inbox = yield* NoticeInbox;

    return handlers.handleAll({
      list: ({ query }) =>
        Effect.gen(function* list() {
          const reader = yield* currentReader;

          // A cursor is the id of the last notice of the page before.
          const after = Option.fromUndefinedOr(query.cursor).pipe(
            Option.map(decodeNoticeId)
          );

          if (Option.isSome(after) && Option.isNone(after.value)) {
            return yield* new HttpApiError.BadRequest();
          }

          const page = yield* inbox
            .page(reader, {
              after: Option.flatten(after),
              limit: query.limit ?? defaultNoticePageSize,
            })
            .pipe(Effect.catchTags({ ...denied, DatabaseError: Effect.die }));

          return {
            items: page.items.map(noticeView),
            nextCursor: Option.getOrNull(page.next),
          };
        }),
      markAllRead: () =>
        Effect.gen(function* markAllRead() {
          const reader = yield* currentReader;

          const unread = yield* inbox
            .markAllRead(reader)
            .pipe(Effect.catchTags({ ...denied, DatabaseError: Effect.die }));

          return { unread };
        }),
      markRead: ({ payload }) =>
        Effect.gen(function* markRead() {
          const reader = yield* currentReader;

          // An id that is not a notice id names none of the user's notices.
          const noticeIds = payload.ids.flatMap((id) =>
            Option.toArray(decodeNoticeId(id))
          );

          const unread = yield* inbox
            .markRead(reader, noticeIds)
            .pipe(Effect.catchTags({ ...denied, DatabaseError: Effect.die }));

          return { unread };
        }),
      unread: () =>
        Effect.gen(function* unread() {
          const reader = yield* currentReader;

          const count = yield* inbox
            .unread(reader)
            .pipe(Effect.catchTags({ ...denied, DatabaseError: Effect.die }));

          return { unread: count };
        }),
    });
  })
);

export const NotificationPreferencesHandlers = HttpApiBuilder.group(
  Api,
  "notificationPreferences",
  Effect.fn(function* notificationPreferencesHandlers(handlers) {
    const settings = yield* NotificationSettings;

    return handlers.handleAll({
      get: () =>
        Effect.gen(function* get() {
          const reader = yield* currentReader;

          const preferences = yield* settings
            .get(reader)
            .pipe(Effect.catchTags({ ...denied, DatabaseError: Effect.die }));

          return preferencesView(preferences);
        }),
      update: ({ payload }) =>
        Effect.gen(function* update() {
          const reader = yield* currentReader;

          const preferences = yield* settings
            .change(reader, payload)
            .pipe(Effect.catchTags({ ...denied, DatabaseError: Effect.die }));

          return preferencesView(preferences);
        }),
    });
  })
);
