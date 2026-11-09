import type { Option } from "effect";
import { DateTime, Duration, Result, Schema } from "effect";

import type { Actor, ActorSubject } from "#shared/domain/access.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, UserId } from "#shared/domain/ids.ts";

import { InvalidConnectState } from "./invalid-connect-state.ts";
import { PlatformSchema } from "./platform.ts";
import type { Platform } from "./platform.ts";

/**
 * How long a member has to sign in on the platform and come back. Platforms
 * keep their own requests for minutes, not hours.
 */
export const connectAttemptLifetime = Duration.minutes(15);

/** How an attempt, or a choice, a user started names them. */
export const userStarter = (userId: UserId): string => `user:${userId}`;

/**
 * Who started an attempt, in a form that compares as text: the user, or the
 * API key. Staff impersonating a user cannot connect accounts, so a user's
 * attempt is theirs alone.
 */
export const starterOf = (subject: ActorSubject): string =>
  subject._tag === "user"
    ? userStarter(subject.userId)
    : `apiKey:${subject.apiKeyId}`;

/**
 * A member's sign-in on a platform, between leaving Acme and coming back.
 * `state` names it in the platform's callback; it is bound to the workspace
 * and the member who started it, so a callback from anyone else, or for
 * another workspace, cannot complete it.
 */
export class ConnectAttempt extends Schema.Class<ConnectAttempt>(
  "acme-server/channels/domain/ConnectAttempt"
)({
  // The channel it reconnects; none when it connects a new account.
  channelId: Schema.Option(ChannelIdSchema),
  createdAt: Schema.DateTimeUtc,
  expiresAt: Schema.DateTimeUtc,
  // The server the account lives on, for platforms with many (Mastodon).
  instance: Schema.Option(Schema.NonEmptyString),
  platform: PlatformSchema,
  startedBy: Schema.NonEmptyString,
  state: Schema.NonEmptyString,
  workspaceId: WorkspaceIdSchema,
}) {}

/** Records an attempt the actor starts now. */
export const startAttempt = (
  attempt: {
    readonly actor: Actor;
    readonly channelId: Option.Option<ChannelId>;
    readonly instance: Option.Option<string>;
    readonly platform: Platform;
    readonly state: string;
  },
  now: DateTime.Utc
): ConnectAttempt =>
  new ConnectAttempt({
    channelId: attempt.channelId,
    createdAt: now,
    expiresAt: DateTime.addDuration(now, connectAttemptLifetime),
    instance: attempt.instance,
    platform: attempt.platform,
    startedBy: starterOf(attempt.actor.subject),
    state: attempt.state,
    workspaceId: attempt.actor.workspaceId,
  });

/**
 * The attempt, if this actor may complete it for this platform now: the one
 * who started it, in the same workspace, before it expired. Every refusal
 * looks the same, so a callback learns nothing about attempts not its own.
 */
export const completableBy = (
  attempt: ConnectAttempt,
  actor: Actor,
  platform: Platform,
  now: DateTime.Utc
): Result.Result<ConnectAttempt, InvalidConnectState> =>
  attempt.workspaceId === actor.workspaceId &&
  attempt.startedBy === starterOf(actor.subject) &&
  attempt.platform === platform &&
  DateTime.isLessThan(now, attempt.expiresAt)
    ? Result.succeed(attempt)
    : Result.fail(new InvalidConnectState());
