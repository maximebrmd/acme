import { DateTime, Option, Result, Schema } from "effect";

import type { Actor } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

import { connectAttemptLifetime, starterOf } from "./connect-attempt.ts";
import { InvalidConnectState } from "./invalid-connect-state.ts";
import { PlatformSchema } from "./platform.ts";
import type { Platform } from "./platform.ts";

/**
 * Accounts a sign-in reached, waiting for the member to pick those to
 * connect: the Pages a Facebook user manages, say. `selection` names it to
 * the member's browser; like an attempt, it is bound to the workspace and
 * the member, lasts a quarter of an hour and is used once. `grantedBy` is
 * the platform user whose grant the accounts' tokens rest on, the Facebook
 * user who signed in, so a request to delete that user's data finds it.
 */
export class ConnectChoice extends Schema.Class<ConnectChoice>(
  "acme-server/channels/domain/ConnectChoice"
)({
  createdAt: Schema.DateTimeUtc,
  expiresAt: Schema.DateTimeUtc,
  grantedBy: Schema.Option(Schema.NonEmptyString),
  platform: PlatformSchema,
  selection: Schema.NonEmptyString,
  startedBy: Schema.NonEmptyString,
  workspaceId: WorkspaceIdSchema,
}) {}

/** Records a choice the actor is offered now. */
export const offerChoice = (
  choice: {
    readonly actor: Actor;
    readonly grantedBy: Option.Option<string>;
    readonly platform: Platform;
    readonly selection: string;
  },
  now: DateTime.Utc
): ConnectChoice =>
  new ConnectChoice({
    createdAt: now,
    expiresAt: DateTime.addDuration(now, connectAttemptLifetime),
    grantedBy: Option.filter(choice.grantedBy, (user) => user !== ""),
    platform: choice.platform,
    selection: choice.selection,
    startedBy: starterOf(choice.actor.subject),
    workspaceId: choice.actor.workspaceId,
  });

/**
 * The choice, if this actor may make it for this platform now: the one it
 * was offered to, in the same workspace, before it expired. Every refusal
 * looks the same, as for attempts.
 */
export const choosableBy = (
  choice: ConnectChoice,
  actor: Actor,
  platform: Platform,
  now: DateTime.Utc
): Result.Result<ConnectChoice, InvalidConnectState> =>
  choice.workspaceId === actor.workspaceId &&
  choice.startedBy === starterOf(actor.subject) &&
  choice.platform === platform &&
  DateTime.isLessThan(now, choice.expiresAt)
    ? Result.succeed(choice)
    : Result.fail(new InvalidConnectState());
