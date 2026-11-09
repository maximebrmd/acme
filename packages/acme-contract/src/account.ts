import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { ApiKeySchema } from "./api-keys.ts";
import { Authentication } from "./authentication.ts";
import { ConnectedAppSchema } from "./connected-apps.ts";
import { Forbidden } from "./forbidden.ts";
import { IncorrectPassword } from "./incorrect-password.ts";
import { LastOwner } from "./last-owner.ts";
import { NoticeEventSchema } from "./notices.ts";
import { NotificationPreferencesSchema } from "./notification-preferences.ts";
import { TooManyPasswordAttempts } from "./too-many-password-attempts.ts";
import { WorkspaceBusy } from "./workspace-busy.ts";

const instant = Schema.DateTimeUtc;

const nullable = Schema.NullOr;

// What an export holds, part by part. Secrets never appear in it: no
// password hash, session token, API key or channel token.

const ExportedUserSchema = Schema.Struct({
  createdAt: instant,
  email: Schema.String,
  emailVerified: Schema.Boolean,
  id: Schema.String,
  image: nullable(Schema.String),
  locale: Schema.Literals(["en", "fr"]),
  name: Schema.String,
  updatedAt: instant,
});

const ExportedSignInMethodSchema = Schema.Struct({
  createdAt: instant,
  // `credential` for an email and a password.
  provider: Schema.String,
  updatedAt: instant,
});

const ExportedSessionSchema = Schema.Struct({
  createdAt: instant,
  expiresAt: instant,
  ipAddress: nullable(Schema.String),
  updatedAt: instant,
  userAgent: nullable(Schema.String),
});

const ExportedMembershipSchema = Schema.Struct({
  joinedAt: instant,
  role: Schema.String,
  workspaceId: Schema.String,
  workspaceName: Schema.String,
});

const ExportedInvitationSchema = Schema.Struct({
  createdAt: instant,
  email: Schema.String,
  expiresAt: instant,
  role: nullable(Schema.String),
  status: Schema.String,
  workspaceId: Schema.String,
  workspaceName: Schema.String,
});

const ExportedNoticeSchema = Schema.Struct({
  createdAt: instant,
  event: NoticeEventSchema,
  id: Schema.String,
  readAt: nullable(instant),
  workspaceId: Schema.String,
});

const ExportedChannelSchema = Schema.Struct({
  createdAt: instant,
  displayName: nullable(Schema.String),
  handle: Schema.String,
  id: Schema.String,
  platform: Schema.String,
  status: Schema.String,
});

const ExportedPostSchema = Schema.Struct({
  id: Schema.String,
  media: Schema.Array(
    Schema.Struct({ altText: nullable(Schema.String), mediaId: Schema.String })
  ),
  scheduledAt: nullable(instant),
  status: Schema.String,
  targets: Schema.Array(
    Schema.Struct({
      channelId: Schema.String,
      finishedAt: nullable(instant),
      permalink: nullable(Schema.String),
      status: Schema.String,
    })
  ),
  text: Schema.String,
  textOverrides: Schema.Array(
    Schema.Struct({ channelId: Schema.String, text: Schema.String })
  ),
  timeZone: nullable(Schema.String),
});

const ExportedMediaSchema = Schema.Struct({
  altText: nullable(Schema.String),
  byteSize: Schema.Int,
  contentType: Schema.String,
  createdAt: instant,
  durationMs: nullable(Schema.Int),
  height: nullable(Schema.Int),
  id: Schema.String,
  status: Schema.String,
  width: nullable(Schema.Int),
});

const ExportedUsageSchema = Schema.Struct({
  // A UTC day, as YYYY-MM-DD.
  day: Schema.String,
  requests: Schema.Int,
});

const ExportedWorkspaceSchema = Schema.Struct({
  apiKeys: Schema.Array(ApiKeySchema),
  assistantUsage: Schema.Array(ExportedUsageSchema),
  channels: Schema.Array(ExportedChannelSchema),
  createdAt: instant,
  id: Schema.String,
  media: Schema.Array(ExportedMediaSchema),
  name: Schema.String,
  posts: Schema.Array(ExportedPostSchema),
  slug: Schema.String,
});

/**
 * Everything Acme keeps about the user: their account, how they sign in,
 * their sessions, workspaces, invitations, connected applications, notices
 * and preferences, and the content of the workspaces where they are the
 * only member, which belongs to them alone. The content of workspaces they
 * share belongs to the team, and is not part of it.
 */
export const AccountExportSchema = Schema.Struct({
  connectedApps: Schema.Array(ConnectedAppSchema),
  exportedAt: instant,
  invitations: Schema.Struct({
    // Sent to the user's address.
    received: Schema.Array(ExportedInvitationSchema),
    // Sent by the user.
    sent: Schema.Array(ExportedInvitationSchema),
  }),
  memberships: Schema.Array(ExportedMembershipSchema),
  notices: Schema.Array(ExportedNoticeSchema),
  notificationPreferences: NotificationPreferencesSchema,
  sessions: Schema.Array(ExportedSessionSchema),
  signInMethods: Schema.Array(ExportedSignInMethodSchema),
  user: ExportedUserSchema,
  // The workspaces where the user is the only member, with their content.
  workspaces: Schema.Array(ExportedWorkspaceSchema),
}).annotate({ identifier: "AccountExport" });

export type AccountExport = typeof AccountExportSchema.Type;

/** What confirms an account's deletion: its password. */
export const DeleteAccountSchema = Schema.Struct({
  password: Schema.String,
}).annotate({ identifier: "DeleteAccount" });

export type DeleteAccount = typeof DeleteAccountSchema.Type;

/**
 * The signed-in user's rights over their own data: a copy of it, and the
 * account's deletion. Only the user, signed in with their own session, may
 * ask: API keys, OAuth clients and staff impersonating the user get 403.
 */
export class AccountApi extends HttpApiGroup.make("account")
  .add(
    HttpApiEndpoint.get("export", "/export", {
      error: [Forbidden],
      success: HttpApiSchema.WithHeaders(AccountExportSchema, {
        "content-disposition": Schema.String,
      }),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers with a JSON copy of everything Acme keeps about the user, as a file to save: their account, how they sign in, their sessions, memberships, invitations, connected applications, notices and preferences, and the channels, posts, media details, API keys and assistant usage of the workspaces where they are the only member. It holds no secret: no password, token or key.",
        summary: "Export my data",
      })
    ),
    HttpApiEndpoint.delete("delete", "/", {
      error: [
        Forbidden,
        IncorrectPassword,
        LastOwner,
        TooManyPasswordAttempts,
        WorkspaceBusy,
      ],
      payload: DeleteAccountSchema,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes the account for good, once `password` confirms it is the user asking: the workspaces where they are the only member, with everything in them, their memberships of the others, their sessions, notices, preferences, invitations and connected applications. Refused (409) while they are the only owner of a workspace that has other members, and (429) for a few seconds after three passwords tried within 10 seconds, as signing in is. A confirmation is emailed to the address the account had.",
        summary: "Delete my account",
      })
    )
  )
  .middleware(Authentication)
  .prefix("/api/me") {}
