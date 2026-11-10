import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { ApiKeySchema } from "./api-keys.ts";
import { Authentication } from "./authentication.ts";
import { BillingUnavailable } from "./billing-unavailable.ts";
import { ConnectedAppSchema } from "./connected-apps.ts";
import { DeletionIncomplete } from "./deletion-incomplete.ts";
import { Forbidden } from "./forbidden.ts";
import { IncorrectPassword } from "./incorrect-password.ts";
import { Int64Schema, ByteCountSchema } from "./int64.ts";
import { LastOwner } from "./last-owner.ts";
import { MediaStoreUnavailable } from "./media-store-unavailable.ts";
import { NoticeEventSchema } from "./notices.ts";
import { NotificationPreferencesSchema } from "./notification-preferences.ts";
import { PartnerOwnsWorkspaces } from "./partner-owns-workspaces.ts";
import { StaffActionSchema, StaffObjectIdsSchema } from "./staff.ts";
import { TargetOptionsSchema } from "./target-options.ts";
import { TooManyPasswordAttempts } from "./too-many-password-attempts.ts";
import { WorkspaceBusy } from "./workspace-busy.ts";
import { WorkspaceSubscribed } from "./workspace-subscribed.ts";

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
  // The way in it came through, on a platform that has several (a LinkedIn
  // profile or page, Instagram's two logins); null elsewhere.
  connection: nullable(Schema.String),
  createdAt: instant,
  displayName: nullable(Schema.String),
  handle: Schema.String,
  id: Schema.String,
  // The name the workspace gave it; null when it gave none.
  label: nullable(Schema.String),
  platform: Schema.String,
  status: Schema.String,
});

// How a post was created or scheduled: in the web app (`web`), with an API
// key (`apiKey`) or through an OAuth application (`application`), with the
// key's or the application's name then.
const ExportedPostOriginSchema = Schema.Struct({
  name: nullable(Schema.String),
  via: Schema.String,
});

const ExportedAttachmentSchema = Schema.Struct({
  altText: nullable(Schema.String),
  mediaId: Schema.String,
});

const ExportedOverrideSchema = Schema.Struct({
  channelId: Schema.String,
  text: Schema.String,
});

const ExportedPostSchema = Schema.Struct({
  // How it was created; null on a post from before this was kept.
  createdVia: nullable(ExportedPostOriginSchema),
  // The parts that follow its first, in order (a thread, or comments,
  // depending on the platform), each with the seconds it waits after the
  // part before it. Empty on a post of one part.
  followUps: Schema.Array(
    Schema.Struct({
      delaySeconds: Schema.Int,
      media: Schema.Array(ExportedAttachmentSchema),
      text: Schema.String,
      textOverrides: Schema.Array(ExportedOverrideSchema),
    })
  ),
  id: Schema.String,
  media: Schema.Array(ExportedAttachmentSchema),
  scheduledAt: nullable(instant),
  // How it was last scheduled; null on a draft, or when it was not kept.
  scheduledVia: nullable(ExportedPostOriginSchema),
  status: Schema.String,
  // The workspace's tags it is filed under (`saved.tags` names them).
  tagIds: Schema.Array(Schema.String),
  targets: Schema.Array(
    Schema.Struct({
      channelId: Schema.String,
      finishedAt: nullable(instant),
      // The platform kept the video private although it was asked otherwise.
      keptPrivate: Schema.Boolean,
      // What the post set on that channel's platform, null when nothing.
      options: nullable(TargetOptionsSchema),
      // How many of the post's parts are live there.
      partsLive: Schema.Int,
      permalink: nullable(Schema.String),
      status: Schema.String,
    })
  ),
  text: Schema.String,
  textOverrides: Schema.Array(ExportedOverrideSchema),
  timeZone: nullable(Schema.String),
});

// Something staff did to the account, from the audit log, changes they
// made while acting as it included: who did it is left out, as it is
// staff's.
const ExportedStaffActionSchema = Schema.Struct({
  action: StaffActionSchema,
  at: instant,
  // When a ban was to end; null for any other action, or a ban for good.
  banExpiresAt: nullable(instant),
  // The ids a change made while acting as the account named.
  objectIds: StaffObjectIdsSchema,
  // What staff asked for while acting as the account (`posts.update`,
  // `auth:/organization/set-active`), or stopped it with.
  operation: nullable(Schema.String),
  reason: nullable(Schema.String),
  // The workspace such a change was in.
  workspaceId: nullable(Schema.String),
});

// A connection that created, changed or deleted content: when, from which
// address, over which protocol, how it authenticated (`session`, `apiKey`,
// `oauth` or `mcp`) and in which workspace.
const ExportedConnectionSchema = Schema.Struct({
  access: Schema.String,
  at: instant,
  ipAddress: nullable(Schema.String),
  protocol: Schema.String,
  workspaceId: nullable(Schema.String),
});

// What the law has Peal keep beyond the account, as a host must so that
// whoever contributed content can be identified: why, for how long, who may
// obtain it, the connections kept so far, and what closing the account
// leaves.
const ExportedLegalHoldSchema = Schema.Struct({
  // The texts that oblige Peal to keep it.
  basis: Schema.String,
  // How many years each connection is kept after it was made.
  connectionYears: Schema.Int,
  // The connections of the account that made content, oldest first.
  connections: Schema.Array(ExportedConnectionSchema),
  // Who may obtain it, and how.
  disclosedTo: Schema.String,
  // What closing the account leaves, and for how many years after.
  keptAfterClosure: Schema.Array(
    Schema.Struct({ data: Schema.Array(Schema.String), years: Schema.Int })
  ),
});

// What GDPR Article 15(1) has the controller tell with the copy: for each
// category of data the server processes, what it holds, why, on which
// legal basis, for how long and where it came from; who receives it; the
// rights over it and how to exercise them; and the right to complain. In
// the account's language, from the registry the privacy policy's retention
// table is written from (`peal-contract/data-processing`). What only the
// operator knows (who it is, its sub-processors, its supervisory
// authority) is null until it declares it: the software guesses none.
const ExportedAboutSchema = Schema.Struct({
  categories: Schema.Array(
    Schema.Struct({
      // What the category holds.
      data: Schema.String,
      id: Schema.String,
      legalBasis: Schema.String,
      name: Schema.String,
      purposes: Schema.String,
      // How long it is kept, or what decides it.
      retention: Schema.String,
      // Where the data came from.
      source: Schema.String,
    })
  ),
  complaint: Schema.Struct({
    // The operator's supervisory authority, when it declared one.
    authority: nullable(
      Schema.Struct({ name: Schema.String, url: nullable(Schema.String) })
    ),
    right: Schema.String,
  }),
  // Who decides what the data is processed for: whoever runs the server.
  controller: nullable(
    Schema.Struct({
      address: nullable(Schema.String),
      // Where to write to exercise the rights below.
      contact: nullable(Schema.String),
      dataProtectionOfficer: nullable(Schema.String),
      name: Schema.String,
    })
  ),
  // The language its sentences are in: the account's.
  language: Schema.Literals(["en", "fr"]),
  policyUrl: nullable(Schema.String),
  // The providers the operator uses to run the service, each with what it
  // does, where, and what safeguards a transfer outside the EEA.
  processors: nullable(
    Schema.Array(
      Schema.Struct({
        country: Schema.String,
        name: Schema.String,
        safeguard: nullable(Schema.String),
        service: Schema.String,
      })
    )
  ),
  // Who receives the data because of how the service works.
  recipients: Schema.Array(Schema.String),
  rights: Schema.Array(
    Schema.Struct({
      // The GDPR article that gives the right.
      article: Schema.String,
      how: Schema.String,
      id: Schema.String,
      right: Schema.String,
    })
  ),
});

const ExportedMediaSchema = Schema.Struct({
  altText: nullable(Schema.String),
  byteSize: ByteCountSchema,
  contentType: Schema.String,
  createdAt: instant,
  // A link that downloads the file for 7 days; null for a file never
  // uploaded, or refused.
  downloadUrl: nullable(Schema.String),
  durationMs: nullable(Schema.Int),
  height: nullable(Schema.Int),
  id: Schema.String,
  // A document's pages; null for an image or a video.
  pageCount: nullable(Schema.Int),
  status: Schema.String,
  width: nullable(Schema.Int),
});

// A post the user wrote in a workspace they share, which is theirs to copy.
const ExportedAuthoredPostSchema = Schema.Struct({
  ...ExportedPostSchema.fields,
  workspaceId: Schema.String,
});

// The workspace's plan, null on a server that does not bill, its
// subscriptions as Stripe last described them: no card, invoice or Stripe
// id, which stay with Stripe; and how many posts it made each month (from
// its first instant, UTC) on platforms that bill the server per post (X),
// and how many of them held a link.
const ExportedBillingSchema = Schema.Struct({
  meteredPosts: Schema.Array(
    Schema.Struct({
      month: instant,
      platform: Schema.String,
      posts: Schema.Int,
      postsWithLinks: Schema.Int,
    })
  ),
  plan: nullable(Schema.String),
  subscriptions: Schema.Array(
    Schema.Struct({
      cancelAtPeriodEnd: Schema.Boolean,
      currentPeriodEnd: nullable(instant),
      plan: Schema.String,
      status: Schema.String,
    })
  ),
});

// A change the user asked for in a workspace, as its activity log keeps
// it: when, which operation (`posts.schedule`, or `mcp.<tool>`), how they
// authenticated (`session`, `apiKey`, `oauth` or `mcp`) and the status
// answered, null when there is none. `byStaff` tells the changes staff
// asked while acting as the user, which are in the log under the user,
// from the user's own. Never what the request carried.
const ExportedActivitySchema = Schema.Struct({
  at: instant,
  byStaff: Schema.Boolean,
  operation: Schema.String,
  status: nullable(Schema.Int),
  via: Schema.String,
  workspaceId: Schema.String,
});

// The orders and withdrawals the user made, and their requests to cancel
// a contract or withdraw from it, kept as the proof of each contract: the
// workspace is null once it is erased.
const ExportedContractsSchema = Schema.Struct({
  orders: Schema.Array(
    Schema.Struct({
      // The version of the words they agreed to when ordering.
      consentVersion: Schema.String,
      createdAt: instant,
      interval: Schema.String,
      plan: Schema.String,
      trial: Schema.Boolean,
      // When a checkout took it.
      usedAt: nullable(instant),
      workspaceId: nullable(Schema.String),
    })
  ),
  // Each request to cancel or withdraw the user made in session, or that
  // came through the form with their address: when it was received, what
  // it said and what became of it.
  requests: Schema.Array(
    Schema.Struct({
      // `session`, or `form` for the form anyone reaches.
      channel: Schema.String,
      // The contract as the form named it.
      contract: nullable(Schema.String),
      // The day asked for the contract to end.
      desiredAt: nullable(instant),
      // When the contract ends, once applied.
      effectiveAt: nullable(instant),
      email: nullable(Schema.String),
      // `cancellation` or `withdrawal`.
      kind: Schema.String,
      name: nullable(Schema.String),
      receivedAt: instant,
      refunded: nullable(
        Schema.Struct({ amount: Schema.Int, currency: Schema.String })
      ),
      // Why its contract refused it.
      refusal: nullable(Schema.String),
      status: Schema.String,
      workspaceId: nullable(Schema.String),
    })
  ),
  withdrawals: Schema.Array(
    Schema.Struct({
      refunded: Schema.Struct({ amount: Schema.Int, currency: Schema.String }),
      requestedAt: instant,
      workspaceId: nullable(Schema.String),
    })
  ),
});

const ExportedUsageSchema = Schema.Struct({
  // A UTC day, as YYYY-MM-DD.
  day: Schema.String,
  requests: Schema.Int,
});

// A post analytics followed on a channel, and each reading of its counts.
// Quotes, impressions, clicks, reach and saves are null where the platform
// gives none.
const ExportedAnalyticsSchema = Schema.Struct({
  channelId: Schema.String,
  permalink: nullable(Schema.String),
  postId: Schema.String,
  publishedAt: instant,
  snapshots: Schema.Array(
    Schema.Struct({
      clicks: nullable(Schema.Int),
      collectedAt: instant,
      impressions: nullable(Schema.Int),
      likes: Schema.Int,
      quotes: nullable(Schema.Int),
      reach: nullable(Schema.Int),
      replies: Schema.Int,
      reposts: Schema.Int,
      saves: nullable(Schema.Int),
    })
  ),
  targetId: Schema.String,
});

// A comment in a post's review. `author` is member, apiKey or visitor; a
// visitor's name is null once past its retention.
const ExportedReviewCommentSchema = Schema.Struct({
  author: Schema.String,
  authorName: nullable(Schema.String),
  authorUserId: nullable(Schema.String),
  channelId: nullable(Schema.String),
  createdAt: instant,
  id: Schema.String,
  parentId: nullable(Schema.String),
  postId: Schema.String,
  quote: nullable(Schema.String),
  resolvedAt: nullable(instant),
  text: Schema.String,
});

// An approval asked for a post, and what was decided: `status` is pending,
// approved, changesRequested or withdrawn.
const ExportedApprovalSchema = Schema.Struct({
  decidedAt: nullable(instant),
  decidedBy: nullable(Schema.String),
  decidedByName: nullable(Schema.String),
  decidedByUserId: nullable(Schema.String),
  id: Schema.String,
  postId: Schema.String,
  requestedAt: instant,
  requestedBy: nullable(Schema.String),
  scheduledAt: instant,
  status: Schema.String,
});

// What the reviews of a workspace's posts hold: its approval policy, the
// links made to its posts (never their tokens), their comments and the
// approvals asked and decided. Never the address a visitor left.
const ExportedReviewSchema = Schema.Struct({
  approvalPolicy: Schema.String,
  approvals: Schema.Array(ExportedApprovalSchema),
  comments: Schema.Array(ExportedReviewCommentSchema),
  links: Schema.Array(
    Schema.Struct({
      access: Schema.String,
      createdAt: instant,
      createdBy: nullable(Schema.String),
      expiresAt: instant,
      id: Schema.String,
      postId: Schema.String,
      revokedAt: nullable(instant),
    })
  ),
});

const inWorkspace = { workspaceId: Schema.String };

// What the user wrote and decided in the reviews of posts, anywhere.
const ExportedUserReviewSchema = Schema.Struct({
  approvals: Schema.Array(
    Schema.Struct({ ...ExportedApprovalSchema.fields, ...inWorkspace })
  ),
  comments: Schema.Array(
    Schema.Struct({ ...ExportedReviewCommentSchema.fields, ...inWorkspace })
  ),
});

// A reply the user sent from Peal to a comment under a post: what they
// wrote, when, and how sending ended. The comment is someone else's, and
// is not part of the export.
const ExportedReplySchema = Schema.Struct({
  channelId: Schema.String,
  createdAt: instant,
  id: Schema.String,
  permalink: nullable(Schema.String),
  postId: Schema.String,
  status: Schema.String,
  text: Schema.String,
  ...inWorkspace,
});

// A webhook endpoint: where the workspace is told what happens in it,
// without the secret that signs what it is sent.
const ExportedWebhookSchema = Schema.Struct({
  createdAt: instant,
  description: Schema.String,
  enabled: Schema.Boolean,
  eventTypes: Schema.Array(Schema.String),
  id: Schema.String,
  url: Schema.String,
});

// A channel's account on one UTC day: its followers, the accounts it
// follows and its posts as read that day, and the views and reach its
// platform counted. Each is null where the platform gives none.
const ExportedAccountDaySchema = Schema.Struct({
  channelId: Schema.String,
  // A UTC day, as YYYY-MM-DD.
  day: Schema.String,
  followers: nullable(Schema.Int),
  following: nullable(Schema.Int),
  platform: Schema.String,
  posts: nullable(Schema.Int),
  reach: nullable(Schema.Int),
  views: nullable(Schema.Int),
});

// What a workspace saved to write and file its posts.
const ExportedSavedItemsSchema = Schema.Struct({
  // The options new posts take on a channel when they give none.
  channelDefaults: Schema.Array(
    Schema.Struct({ channelId: Schema.String, options: Schema.Unknown })
  ),
  channelSets: Schema.Array(
    Schema.Struct({
      channelIds: Schema.Array(Schema.String),
      createdAt: instant,
      id: Schema.String,
      name: Schema.String,
      // The options posts take on some of its channels.
      options: Schema.Unknown,
    })
  ),
  signatures: Schema.Array(
    Schema.Struct({
      createdAt: instant,
      id: Schema.String,
      isDefault: Schema.Boolean,
      name: Schema.String,
      // `workspace`, `platform` or `channel`.
      scope: Schema.String,
      scopeChannelId: nullable(Schema.String),
      scopePlatform: nullable(Schema.String),
      text: Schema.String,
    })
  ),
  tags: Schema.Array(
    Schema.Struct({
      colour: Schema.String,
      createdAt: instant,
      id: Schema.String,
      name: Schema.String,
    })
  ),
});

// What ads keep of the workspace: its sign-ins to ad networks without
// their tokens, its ad accounts with what an owner allowed them to spend,
// its boosts as they were asked, and the audit trail of every decision
// about money. Amounts are in each account's minor units. The campaigns
// and numbers read from the networks are read there.
const ExportedAdsSchema = Schema.Struct({
  accounts: Schema.Array(
    Schema.Struct({
      connectedAt: instant,
      currency: Schema.String,
      externalId: Schema.String,
      id: Schema.String,
      monthlyCeiling: nullable(Int64Schema),
      name: Schema.String,
      network: Schema.String,
      spendingEnabled: Schema.Boolean,
      timeZone: Schema.String,
    })
  ),
  audit: Schema.Array(
    Schema.Struct({
      accountId: nullable(Schema.String),
      action: Schema.String,
      amounts: Schema.Unknown,
      at: instant,
      boostId: nullable(Schema.String),
      currency: nullable(Schema.String),
    })
  ),
  boosts: Schema.Array(
    Schema.Struct({
      accountId: Schema.String,
      audience: Schema.Unknown,
      beneficiary: nullable(Schema.String),
      budgetAmount: Int64Schema,
      budgetKind: Schema.String,
      committed: Int64Schema,
      createdAt: instant,
      currency: Schema.String,
      endsAt: instant,
      id: Schema.String,
      payer: nullable(Schema.String),
      postId: Schema.String,
      startsAt: instant,
      state: Schema.String,
    })
  ),
  connections: Schema.Array(
    Schema.Struct({
      createdAt: instant,
      id: Schema.String,
      network: Schema.String,
      scopes: Schema.Array(Schema.String),
    })
  ),
});

const ExportedWorkspaceSchema = Schema.Struct({
  accountAnalytics: Schema.Array(ExportedAccountDaySchema),
  ads: ExportedAdsSchema,
  analytics: Schema.Array(ExportedAnalyticsSchema),
  apiKeys: Schema.Array(ApiKeySchema),
  assistantUsage: Schema.Array(ExportedUsageSchema),
  billing: ExportedBillingSchema,
  channels: Schema.Array(ExportedChannelSchema),
  createdAt: instant,
  id: Schema.String,
  media: Schema.Array(ExportedMediaSchema),
  name: Schema.String,
  posts: Schema.Array(ExportedPostSchema),
  review: ExportedReviewSchema,
  // Its tags, signatures, channel sets and channels' default options.
  saved: ExportedSavedItemsSchema,
  slug: Schema.String,
  webhooks: Schema.Array(ExportedWebhookSchema),
});

/**
 * Everything Peal keeps about the user: their account, how they sign in,
 * their sessions, workspaces, invitations, connected applications, notices
 * and preferences, what staff did to their account, the changes they asked
 * for in workspaces as the activity logs keep them, the orders and
 * withdrawals they made, the posts they wrote in the workspaces they share,
 * what they wrote and decided in the reviews of posts, the
 * connections that made content and what the law has Peal keep once the
 * account closes, and
 * the content of the workspaces where they are the only member, which
 * belongs to them alone. The rest of the content of workspaces they share
 * belongs to the team, and is not part of it.
 */
export const AccountExportSchema = Schema.Struct({
  // The information GDPR Article 15(1) lists about this processing.
  about: ExportedAboutSchema,
  // The changes the user asked for in workspaces, oldest first, as their
  // activity logs keep them.
  activity: Schema.Array(ExportedActivitySchema),
  // The posts the user wrote in the workspaces they share with others.
  authoredPosts: Schema.Array(ExportedAuthoredPostSchema),
  connectedApps: Schema.Array(ConnectedAppSchema),
  // The orders and withdrawals the user made, in any workspace.
  contracts: ExportedContractsSchema,
  exportedAt: instant,
  invitations: Schema.Struct({
    // Sent to the user's address.
    received: Schema.Array(ExportedInvitationSchema),
    // Sent by the user.
    sent: Schema.Array(ExportedInvitationSchema),
  }),
  // What the law has Peal keep beyond the account, and what closing it
  // leaves; null on a server that keeps nothing for the law.
  legalHold: nullable(ExportedLegalHoldSchema),
  memberships: Schema.Array(ExportedMembershipSchema),
  notices: Schema.Array(ExportedNoticeSchema),
  notificationPreferences: NotificationPreferencesSchema,
  // The replies the user sent to comments under posts, in any workspace.
  replies: Schema.Array(ExportedReplySchema),
  // The comments the user wrote on posts, the approvals they asked for and
  // those they decided, in any workspace.
  review: ExportedUserReviewSchema,
  sessions: Schema.Array(ExportedSessionSchema),
  signInMethods: Schema.Array(ExportedSignInMethodSchema),
  // What staff did to the account, oldest first.
  staffActions: Schema.Array(ExportedStaffActionSchema),
  user: ExportedUserSchema,
  // The workspaces where the user is the only member, with their content.
  workspaces: Schema.Array(ExportedWorkspaceSchema),
}).annotate({ identifier: "AccountExport" });

export type AccountExport = typeof AccountExportSchema.Type;

/**
 * What deleting the account would leave, for the page that asks before it.
 */
export const AccountClosureSchema = Schema.Struct({
  // What the law has the server keep once the account is closed, apart
  // and for authorities only, in years: who held it (`identityYears`), how
  // they signed in and paid (`accountYears`), and each connection that
  // created, changed or deleted content, from when it was made. Null on a
  // server that keeps nothing, as most do; the first two are null on a
  // server that stopped keeping these, where only the connections it
  // already holds stay.
  legalHold: nullable(
    Schema.Struct({
      accountYears: nullable(Schema.Int),
      connectionYears: Schema.Int,
      identityYears: nullable(Schema.Int),
    })
  ),
}).annotate({ identifier: "AccountClosure" });

export type AccountClosure = typeof AccountClosureSchema.Type;

/**
 * What confirms an account's deletion: its password, and, when a workspace
 * it deletes has a subscription Stripe may still bill, the user's
 * agreement to cancel it.
 */
export const DeleteAccountSchema = Schema.Struct({
  // The user agreed that the subscriptions of the workspaces it deletes
  // end now, without a refund of the period paid for. Without it, such a
  // workspace answers WorkspaceSubscribed.
  cancelSubscriptions: Schema.optionalKey(Schema.Boolean),
  password: Schema.String,
}).annotate({ identifier: "DeleteAccount" });

export type DeleteAccount = typeof DeleteAccountSchema.Type;

/**
 * The signed-in user's rights over their own data: a copy of it, and the
 * account's deletion. Only the user may ask, signed in with their own
 * session, or, for the copy, through Peal's command line (the `peal-cli`
 * client, whose tokens are bound to no workspace): API keys, other OAuth
 * clients, MCP clients among them, and staff impersonating the user get 403.
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
          "Answers with a JSON copy of everything Peal keeps about the user, as a file to save, with what GDPR Article 15(1) has the controller tell (`about`: the purposes, legal bases, recipients, retention and source of each category of data, the rights and how to exercise them, in the account's language): their account, how they sign in, their sessions, memberships, invitations, connected applications, notices and preferences, what staff did to their account (action, time and reason, not who), the changes they asked for in workspaces as the activity logs keep them (time, operation, workspace, how they authenticated and the status answered, and whether staff acting as them asked it), the posts they wrote in the workspaces they share, the connections that created, changed or deleted content (time, address, protocol), what the law has Peal keep once the account closes and for how long, and the channels, posts, media details, analytics, API keys, webhook endpoints, assistant usage and billing state (plan and subscription status) of the workspaces where they are the only member. It holds no secret: no password, token, key or card. Open to the user in their own session and to Peal's command line, never to another OAuth client: an MCP client would hand all of it to an AI model. Each copy is emailed to the account's address, saying whether the web app or the command line took it.",
        summary: "Export my data",
      })
    ),
    HttpApiEndpoint.get("closure", "/closure", {
      error: [Forbidden],
      success: AccountClosureSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Says what deleting the account would leave: nothing, on most servers; on one whose operator French law has keep what identifies whoever contributed content, who held the account, how they signed in and the connections that made content, each for the years given. Open to the user in their own session only.",
        summary: "What deleting my account leaves",
      })
    ),
    HttpApiEndpoint.delete("delete", "/", {
      error: [
        Forbidden,
        IncorrectPassword,
        LastOwner,
        TooManyPasswordAttempts,
        WorkspaceBusy,
        PartnerOwnsWorkspaces,
        WorkspaceSubscribed,
        BillingUnavailable,
        MediaStoreUnavailable,
        DeletionIncomplete,
      ],
      payload: DeleteAccountSchema,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes the account for good, once `password` confirms it is the user asking: the workspaces where they are the only member, with everything in them, their memberships of the others, where the posts they wrote stay without an author, their sessions, notices, preferences, invitations and connected applications. Refused (409) while they are the only owner of a workspace that has other members (`LastOwner`), while a post of a workspace it would delete is being published (`WorkspaceBusy`), while the partner account of one of those workspaces still owns workspaces (`PartnerOwnsWorkspaces`), and while one of those workspaces has a subscription Stripe may still bill (`WorkspaceSubscribed`, with its plan and the end of the period paid for) unless `cancelSubscriptions` is `true`, which cancels those subscriptions at Stripe at once, without a refund of the period paid for, except where the law gives one, or any further charge; (503) when Stripe cannot be reached (`BillingUnavailable`), or the object store, where the deletion is recorded by id before it is done so that a restored backup deletes the account again (`MediaStoreUnavailable`), and nothing is deleted; and (429) for a few seconds after three passwords tried within 10 seconds, as signing in is. A deletion that fails once subscriptions are cancelled, whatever stopped it, the object store included, says so (500 `DeletionIncomplete`): the cancellations stand, nothing was deleted, and deleting again cancels nothing more. A confirmation is emailed to the address the account had.",
        summary: "Delete my account",
      })
    )
  )
  .middleware(Authentication)
  .prefix("/api/me") {}
