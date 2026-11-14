import { DateTime, Duration, Option, Schema } from "effect";

import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * How often a channel's conversations are read: a person waits for an
 * answer, so every run of the collection (ten minutes) while the channel
 * had a message in the last day, hourly otherwise.
 */
export const messagesOftenFor = Duration.days(1);

const often = Duration.minutes(10);

const hourly = Duration.hours(1);

/**
 * The direct messages of one channel: when its conversations are read
 * next, and when they were last. One a channel, followed from the channels
 * the directory lists on a platform the server reads messages on.
 */
export class MessageBox extends Schema.Class<MessageBox>(
  "peal-server/engagement/domain/MessageBox"
)({
  channelId: ChannelIdSchema,
  createdAt: Schema.DateTimeUtc,
  lastReadAt: Schema.Option(Schema.DateTimeUtc),
  nextReadAt: Schema.DateTimeUtc,
  workspaceId: WorkspaceIdSchema,
}) {}

/** A channel to follow: read at the next run. */
export const followBox = (
  channel: { readonly channelId: ChannelId; readonly workspaceId: WorkspaceId },
  now: DateTime.Utc
): MessageBox =>
  new MessageBox({
    channelId: channel.channelId,
    createdAt: now,
    lastReadAt: Option.none(),
    nextReadAt: now,
    workspaceId: channel.workspaceId,
  });

/**
 * When to read a channel next after the run `at`: at the next run while
 * its latest message came in the last day (`latest`), an hour later
 * otherwise.
 */
export const nextBoxRead = (
  latest: Option.Option<DateTime.Utc>,
  at: DateTime.Utc
): DateTime.Utc => {
  const recent = Option.exists(latest, (sentAt) =>
    DateTime.isGreaterThan(
      sentAt,
      DateTime.subtractDuration(at, messagesOftenFor)
    )
  );

  return DateTime.addDuration(at, recent ? often : hourly);
};

/** The box once the run `at` read it at `readAt`. */
export const recordBoxRead = (
  box: MessageBox,
  latest: Option.Option<DateTime.Utc>,
  readAt: DateTime.Utc,
  at: DateTime.Utc
): MessageBox =>
  new MessageBox({
    channelId: box.channelId,
    createdAt: box.createdAt,
    lastReadAt: Option.some(readAt),
    nextReadAt: nextBoxRead(latest, at),
    workspaceId: box.workspaceId,
  });

/** The box once the run `at` could not read it: it waits `wait`. */
export const postponeBoxRead = (
  box: MessageBox,
  at: DateTime.Utc,
  wait: Duration.Duration
): MessageBox =>
  new MessageBox({
    channelId: box.channelId,
    createdAt: box.createdAt,
    lastReadAt: box.lastReadAt,
    nextReadAt: DateTime.addDuration(at, wait),
    workspaceId: box.workspaceId,
  });
