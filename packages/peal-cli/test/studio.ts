import { DateTime, Effect, Layer, Option, Ref, Result, Stream } from "effect";
import { HttpRouter } from "effect/http";
import { HttpApiBuilder, HttpApiError, HttpApiSchema } from "effect/http-api";
import {
  AlreadyMember,
  Api,
  ApprovalChanged,
  ApprovalNotPending,
  AssistantQuotaExceeded,
  AssistantUnavailable,
  ImageProviderAddressRefused,
  ImageProviderKeyRequired,
  TextProviderAddressRefused,
  TextProviderKeyRequired,
  TextProviderNotFound,
  TextProviderRefused,
  ChannelNotFound,
  ChannelSetNameTaken,
  ChannelSetNotFound,
  ConnectFailed,
  ConnectLinkNotFound,
  CurrentMember,
  duplicateWindowHours,
  CurrentPrincipal,
  Forbidden,
  LivePostNotChangeable,
  DuplicatePost,
  IdempotencyKeyReused,
  importColumns,
  ImportUnreadable,
  InvalidTimeRange,
  InvalidTimeZone,
  InvitationNotFound,
  maxChannelSetsPerWorkspace,
  maxImportRows,
  maxSignaturesPerWorkspace,
  maxTagsPerWorkspace,
  LookupInputInvalid,
  LookupNotFound,
  maxWebhookEndpoints,
  MediaNotFound,
  MediaSourceNotPublic,
  MediaSourceUnreachable,
  MediaTooLarge,
  PostContentInvalid,
  PostNotFound,
  LastTargetLeft,
  PostStatusConflict,
  PartnerNotFound,
  QueueHasNoRoom,
  ReturnUrlNotAllowed,
  ReviewLinkNotFound,
  ScheduleInPast,
  SignatureNameTaken,
  ShortLinkNotFound,
  SignatureNotFound,
  signedText,
  TagNameTaken,
  TagNotFound,
  TargetStatusConflict,
  TooManyChannelSets,
  TooManySignatures,
  TooManyTags,
  TooManyWebhookEndpoints,
  Unauthenticated,
  UnknownChannels,
  UnknownMedia,
  UnknownTags,
  UnsupportedMediaType,
  UploadIncomplete,
  WebhookDeliveryNotFound,
  WebhookEndpointDisabled,
  WebhookEndpointNotFound,
  WebhooksNotConfigured,
  WebhookUrlRefused,
  WorkspaceAccess,
  WorkspaceNotFound,
} from "peal-contract";
import type {
  Credential,
  CustomerHealth,
  ImageProvider,
  TextProvider,
  Feed,
  LivePostChange,
  LivePostRefusal,
  AccountExport,
  ActivityEvent,
  ApprovalPolicy,
  ApprovalRequest,
  Billing,
  BillingAccount,
  WorkspaceUsageReport,
  Channel,
  ChannelOptions,
  ChannelPreview,
  ChannelSet,
  ConnectedApp,
  ConnectLink,
  ContentViolation,
  CustomerWorkspace,
  DuplicateOnChannel,
  ImportCellProblem,
  ImportColumn,
  ImportRowResult,
  Invitation,
  Me,
  Media,
  MediaContentType,
  NewPost,
  Partner,
  PartnerUsageReport,
  Permission,
  Post,
  RecyclingRule,
  PostContent,
  PostDraft,
  PostOrigin,
  PostSort,
  PostTarget,
  PostValidation,
  PostWarning,
  PublicationAttempt,
  ScheduleCheck,
  ReviewComment,
  ReviewLink,
  Signature,
  SignatureScope,
  SignedRequest,
  Standing,
  Tag,
  TargetOptions,
  TenantUsage,
  TikTokAccount,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEventType,
  WebhookUrlRefusal,
} from "peal-contract";
import {
  countHashtags,
  countLinks,
  countMentions,
  measureText,
  platformRules,
} from "peal-contract/post-text";
import { rateCard } from "peal-contract/rate-card";

import { adsGroupLive, adsWorld } from "./studio-ads.ts";
import type { AdsWorld } from "./studio-ads.ts";
import {
  capabilitiesOn,
  describedPlatforms,
  pinterestLookup,
  playlistPage,
  videoCategories,
} from "./studio-capabilities.ts";
import { studioFeedsOf } from "./studio-feeds.ts";
import { makeInbox, studioInboxLive } from "./studio-inbox.ts";
import type { InboxState } from "./studio-inbox.ts";
import { overviewGroupLive } from "./studio-overview.ts";
import { studioQueues, studioQueuesOf } from "./studio-queues.ts";
import type { StudioQueue } from "./studio-queues.ts";
import { studioRecyclingOf } from "./studio-recycling.ts";

// A synthetic Peal instance's data, in memory, for the commands that act in
// a workspace: two workspaces, their channels, posts, members and
// invitations, and the account's own data. Handlers check the member's
// permissions as the server does, and record the changes they make.

// The totals the analytics dashboard answers with.
const dashboardTotals = {
  clicks: null,
  engagement: 20,
  impressions: null,
  likes: 12,
  posts: 1,
  quotes: 1,
  reach: null,
  replies: 3,
  reposts: 4,
  saves: null,
};

const at = (iso: string) => DateTime.makeUnsafe(iso);

export const studioId = "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60";

export const shopId = "6c1d7f75-6e1a-4b8f-8b63-4a2d3e5f6071";

export const userId = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const everything: readonly Permission[] = [
  "activity:read",
  "ads:read",
  "ads:manage",
  "ads:spend",
  "ads:authorize",
  "assistant:configure",
  "assistant:use",
  "analytics:read",
  "billing:read",
  "channel:read",
  "channel:connect",
  "engagement:read",
  "engagement:reply",
  "invitation:create",
  "invitation:cancel",
  "media:read",
  "media:upload",
  "media:delete",
  "partner:read",
  "organization:update",
  "post:approve",
  "post:read",
  "post:create",
  "post:update",
  "post:delete",
  "post:schedule",
  "post:publish",
  "webhook:read",
  "webhook:manage",
];

const reading: readonly Permission[] = [
  "analytics:read",
  "channel:read",
  "engagement:read",
  "media:read",
  "post:read",
];

/** The user, an owner of Studio and a viewer of Shop. */
export const studioMe: Me = {
  impersonatedBy: null,
  user: {
    email: "synthetic@example.test",
    emailVerified: true,
    id: userId,
    image: null,
    locale: "en",
    name: "Synthetic User",
    twoStepEnabled: false,
  },
  workspaces: [
    {
      id: studioId,
      name: "Studio",
      permissions: everything,
      role: "owner",
      slug: "studio",
      twoStepRequired: false,
    },
    {
      id: shopId,
      name: "Shop",
      permissions: reading,
      role: "viewer",
      slug: "shop",
      twoStepRequired: false,
    },
  ],
};

export const mastodonId = "0190f3a0-0000-7000-8000-00000000c001";

export const blueskyId = "0190f3a0-0000-7000-8000-00000000c002";

export const tiktokId = "0190f3a0-0000-7000-8000-00000000c003";

export const youtubeId = "0190f3a0-0000-7000-8000-00000000c004";

export const instagramId = "0190f3a0-0000-7000-8000-00000000c005";

export const pinterestId = "0190f3a0-0000-7000-8000-00000000c006";

const channels: readonly Channel[] = [
  {
    avatarUrl: null,
    connection: null,
    displayName: "Studio",
    handle: "@studio@social.example.test",
    id: mastodonId,
    label: null,
    platform: "mastodon",
    status: { _tag: "active" },
    tokenExpiresAt: null,
  },
  {
    avatarUrl: null,
    connection: null,
    displayName: null,
    handle: "studio.example.test",
    id: blueskyId,
    label: null,
    platform: "bluesky",
    status: { _tag: "refreshNeeded" },
    tokenExpiresAt: null,
  },
  {
    avatarUrl: null,
    connection: null,
    displayName: "Studio",
    handle: "@studio_example",
    id: tiktokId,
    label: null,
    platform: "tiktok",
    status: { _tag: "active" },
    tokenExpiresAt: null,
  },
  {
    avatarUrl: null,
    connection: null,
    displayName: "Studio videos",
    handle: "Studio videos",
    id: youtubeId,
    label: null,
    platform: "youtube",
    status: { _tag: "active" },
    tokenExpiresAt: null,
  },
  {
    avatarUrl: null,
    connection: "instagramLogin",
    displayName: "Studio",
    handle: "@studio_example",
    id: instagramId,
    label: null,
    platform: "instagram",
    status: { _tag: "active" },
    tokenExpiresAt: null,
  },
  {
    avatarUrl: null,
    connection: null,
    displayName: "Studio",
    handle: "@studioexample",
    id: pinterestId,
    label: null,
    platform: "pinterest",
    status: { _tag: "active" },
    tokenExpiresAt: null,
  },
];

// The TikTok channel's creator, as TikTok tells it.
const tiktokAccount: TikTokAccount = {
  posting: {
    _tag: "ready",
    creator: {
      avatarUrl: null,
      commentDisabled: false,
      duetDisabled: true,
      maxVideoDurationMs: 600_000,
      nickname: "Studio",
      privacyLevels: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
      stitchDisabled: true,
      username: "studio_example",
    },
  },
  takesPhotos: false,
};

export const draftId = "0190f3a0-0000-7000-8000-00000000d001";

export const scheduledId = "0190f3a0-0000-7000-8000-00000000d002";

export const finishedId = "0190f3a0-0000-7000-8000-00000000d003";

export const awaitingId = "0190f3a0-0000-7000-8000-00000000d004";

export const failedTargetId = "0190f3a0-0000-7000-8000-00000000e001";

export const unconfirmedTargetId = "0190f3a0-0000-7000-8000-00000000e002";

export const quotaTargetId = "0190f3a0-0000-7000-8000-00000000e003";

const pendingOn = (id: string, channelId: string): PostTarget => ({
  channelId,
  editedAt: null,
  failureReason: null,
  id,
  options: null,
  parts: { count: 1, live: [] },
  permalink: null,
  publishedAt: null,
  removedAt: null,
  round: 1,
  status: "pending",
  unconfirmedReason: null,
});

const escape = String.fromCodePoint(0x1b);

const contributorId = "8d0f7780-8536-41ef-a55c-f18fd2a01bf8";

const content = (text: string) => ({ media: [], overrides: [], text });

export const campaignTagId = "0190f3a0-0000-7000-8000-00000000a001";

export const evergreenTagId = "0190f3a0-0000-7000-8000-00000000a002";

// The labels the studio files its posts under, oldest first.
const tags: readonly Tag[] = [
  {
    colour: "green",
    createdAt: at("2026-10-01T09:00:00Z"),
    id: campaignTagId,
    name: "Spring campaign",
  },
  {
    colour: "blue",
    createdAt: at("2026-10-02T09:00:00Z"),
    id: evergreenTagId,
    name: "Evergreen",
  },
];

export const signOffId = "0190f3a0-0000-7000-8000-00000000a101";

export const fediverseSignatureId = "0190f3a0-0000-7000-8000-00000000a102";

// The texts the studio ends its posts with, oldest first: the workspace's
// default, and one for Mastodon that is no default.
const signatures: readonly Signature[] = [
  {
    createdAt: at("2026-10-03T09:00:00Z"),
    id: signOffId,
    isDefault: true,
    name: "Sign-off",
    scope: { _tag: "workspace" },
    text: "The Studio team",
  },
  {
    createdAt: at("2026-10-04T09:00:00Z"),
    id: fediverseSignatureId,
    isDefault: false,
    name: "Fediverse",
    scope: { _tag: "platform", platform: "mastodon" },
    text: "#studio #synthetic",
  },
];

/** A channel the studio had, and disconnected: a set still lists it. */
export const goneChannelId = "0190f3a0-0000-7000-8000-00000000c0ff";

export const launchSetId = "0190f3a0-0000-7000-8000-00000000a201";

export const videosSetId = "0190f3a0-0000-7000-8000-00000000a202";

/** A channel set as the studio keeps it: which channels are gone is told. */
type StudioSet = Omit<ChannelSet, "unavailableChannelIds">;

// The selections of channels the studio keeps, oldest first.
const channelSets: readonly StudioSet[] = [
  {
    channelIds: [mastodonId, goneChannelId],
    createdAt: at("2026-10-05T09:00:00Z"),
    id: launchSetId,
    name: "Launch",
    options: [],
  },
  {
    channelIds: [youtubeId],
    createdAt: at("2026-10-06T09:00:00Z"),
    id: videosSetId,
    name: "Videos",
    options: [
      {
        channelId: youtubeId,
        options: {
          madeForKids: false,
          platform: "youtube",
          title: "A synthetic video",
        },
      },
    ],
  },
];

const posts: readonly Post[] = [
  {
    authorId: userId,
    content: content("A synthetic draft about the spring catalogue."),
    createdVia: null,
    id: draftId,
    occurrence: null,
    outcome: null,
    queueId: null,
    recyclingId: null,
    schedule: null,
    scheduledBy: null,
    scheduledVia: null,
    shortenLinks: false,
    status: "draft",
    tagIds: [],
    targets: [pendingOn("0190f3a0-0000-7000-8000-00000000e010", mastodonId)],
  },
  {
    authorId: userId,
    content: content("A synthetic post that goes out next week."),
    createdVia: null,
    id: scheduledId,
    occurrence: null,
    outcome: null,
    queueId: null,
    recyclingId: null,
    schedule: { at: at("2026-11-20T09:00:00Z"), timeZone: "Europe/Paris" },
    scheduledBy: null,
    scheduledVia: null,
    shortenLinks: false,
    status: "scheduled",
    tagIds: [campaignTagId],
    targets: [pendingOn("0190f3a0-0000-7000-8000-00000000e011", mastodonId)],
  },
  {
    authorId: contributorId,
    content: content("A synthetic post that waits. Out on Friday."),
    createdVia: null,
    id: awaitingId,
    occurrence: null,
    outcome: null,
    queueId: null,
    recyclingId: null,
    schedule: { at: at("2026-11-21T09:00:00Z"), timeZone: "Europe/Paris" },
    scheduledBy: contributorId,
    scheduledVia: null,
    shortenLinks: false,
    status: "awaitingApproval",
    tagIds: [],
    targets: [pendingOn("0190f3a0-0000-7000-8000-00000000e012", mastodonId)],
  },
  {
    authorId: userId,
    content: content("A synthetic post that went out yesterday."),
    createdVia: null,
    id: finishedId,
    occurrence: null,
    outcome: "failed",
    queueId: null,
    recyclingId: null,
    schedule: { at: at("2026-11-08T09:00:00Z"), timeZone: "Europe/Paris" },
    scheduledBy: null,
    scheduledVia: null,
    shortenLinks: false,
    status: "finished",
    tagIds: [],
    targets: [
      {
        ...pendingOn(failedTargetId, mastodonId),
        failureReason: "rateLimited",
        status: "failed",
      },
      {
        ...pendingOn(unconfirmedTargetId, blueskyId),
        status: "unconfirmed",
        unconfirmedReason: "noResponse",
      },
      {
        ...pendingOn(quotaTargetId, youtubeId),
        failureReason: "quotaExceeded",
        options: {
          madeForKids: false,
          platform: "youtube",
          title: "A synthetic launch video",
        },
        status: "failed",
      },
    ],
  },
];

// How Peal tried the post that finished, on the channel that limited it.
const attempts: readonly PublicationAttempt[] = [
  {
    attempt: 1,
    finishedAt: at("2026-11-08T09:00:02Z"),
    part: 0,
    refusalCode: "429",
    result: "rateLimited",
    retryAt: at("2026-11-08T09:05:00Z"),
    round: 1,
    startedAt: at("2026-11-08T09:00:00Z"),
    targetId: failedTargetId,
  },
  {
    attempt: 2,
    finishedAt: at("2026-11-08T09:05:02Z"),
    part: 0,
    refusalCode: "429",
    result: "rateLimited",
    retryAt: null,
    round: 1,
    startedAt: at("2026-11-08T09:05:00Z"),
    targetId: failedTargetId,
  },
];

/** The fingerprint of what the post that waits says. */
export const awaitingSubject = "5a".repeat(32);

/** The approval that waits for it. */
export const awaitingApprovalId = "0190f3a0-0000-7000-8000-00000000b001";

// The approval that waits for the post a contributor asked to send.
const approval: ApprovalRequest = {
  decision: null,
  id: awaitingApprovalId,
  postId: awaitingId,
  requestedAt: at("2026-11-09T10:00:00Z"),
  requestedBy: contributorId,
  requestedByName: "Synthetic Contributor",
  requestedVia: "member",
  schedule: { at: at("2026-11-21T09:00:00Z"), timeZone: "Europe/Paris" },
  status: "pending",
  subjectHash: awaitingSubject,
};

// A visitor's comment on it, about a word of its text, as a link's holder
// typed it: what they type is theirs, control characters included.
const comment: ReviewComment = {
  anchor: {
    channelId: mastodonId,
    selection: {
      located: { end: 36, start: 30 },
      quote: "Friday",
      start: 30,
    },
  },
  author: {
    kind: "visitor",
    linkId: "0190f3a0-0000-7000-8000-00000000b002",
    name: "Ada Lovelace",
    userId: null,
  },
  createdAt: at("2026-11-09T11:00:00Z"),
  id: "0190f3a0-0000-7000-8000-00000000b003",
  parentId: null,
  postId: awaitingId,
  resolved: null,
  text: `Could this be ${escape}[31mThursday?`,
};

const invitation: Invitation = {
  createdAt: at("2026-11-01T10:00:00Z"),
  email: "guest@example.test",
  expiresAt: at("2026-11-08T10:00:00Z"),
  id: "0190f3a0-0000-7000-8000-00000000a001",
  inviterId: userId,
  role: "editor",
};

// The studio's billing account: its own, which its user pays for.
const account: BillingAccount = {
  billingWorkspaceId: studioId,
  billingWorkspaceName: "Studio",
  id: "0190f3a0-0000-7000-8000-00000000b001",
  otherWorkspaces: [],
  partner: false,
  payer: true,
  transfer: null,
  workspaces: 1,
};

const within: Standing = {
  account,
  graceUntil: null,
  mustReduce: false,
  over: [],
  plan: "free",
  planWithRoom: null,
  scheduledPosts: 7,
};

// The studio after its subscription ended: more accounts and media than
// the free tier allows.
const over: Standing = {
  account,
  graceUntil: null,
  mustReduce: true,
  over: [
    { allowed: 2, limit: "channels", used: 8 },
    { allowed: 1_000_000_000, limit: "mediaStorage", used: 1_200_000_000 },
  ],
  plan: "free",
  planWithRoom: "payAsYouGo",
  scheduledPosts: 7,
};

const billing: Billing = {
  account,
  // Two accounts on ten days of November: within the free ones.
  accounts: {
    accountDays: 20,
    connected: 2,
    estimate: { amount: 0, currency: "usd" },
    nextAccount: { amount: 500, currency: "usd" },
    pooled: 2,
  },
  allowances: {
    assistantRequests: 0,
    channels: 2,
    mediaStorage: 1_000_000_000,
    members: null,
    scheduledPosts: null,
  },
  currency: "eur",
  enabled: true,
  estimate: { amount: 0, currency: "usd" },
  paymentMethod: false,
  plan: "free",
  plans: [],
  rateCard,
  subscription: null,
  trial: { available: false, days: 14, plan: "pro" },
  upcomingInvoice: null,
  usage: {
    assistantRequests: { resetsAt: at("2026-11-10T00:00:00Z"), used: 2 },
    channels: 2,
    mediaStorage: 125_000_000,
    members: 2,
    scheduledPosts: { resetsAt: at("2026-12-01T00:00:00Z"), used: 7 },
  },
  vatRate: 20,
  withdrawableUntil: null,
};

// The workspace's usage over three days: two with posts, the last
// without a snapshot.
const usageReport = (period: {
  readonly from: string;
  readonly to: string;
}): WorkspaceUsageReport => ({
  allowances: billing.allowances,
  current: billing.usage,
  days: [
    {
      assistantRequests: 1,
      billableAccounts: 2,
      byPlatform: [
        { platform: "bluesky", posts: 1 },
        { platform: "x", posts: 2 },
      ],
      channels: 2,
      day: "2026-11-01",
      mediaStorage: 125_000_000,
      members: 2,
      publishedPosts: 3,
    },
    {
      assistantRequests: 0,
      billableAccounts: 2,
      byPlatform: [],
      channels: 2,
      day: "2026-11-02",
      mediaStorage: 125_000_000,
      members: 2,
      publishedPosts: 0,
    },
    {
      assistantRequests: null,
      billableAccounts: null,
      byPlatform: [],
      channels: null,
      day: "2026-11-03",
      mediaStorage: null,
      members: null,
      publishedPosts: 0,
    },
  ],
  period,
  plan: billing.plan,
  sharedWith: null,
  totals: {
    billableAccountDays: 4,
    byPlatform: [
      { platform: "bluesky", posts: 1 },
      { platform: "x", posts: 2 },
    ],
    channelDays: 4,
    daysCounted: 2,
    meteredPosts: [
      { month: "2026-11-01", platform: "x", posts: 2, postsWithLinks: 1 },
    ],
    publishedPosts: 3,
  },
});

const cli: ConnectedApp = {
  authorizedAt: at("2026-10-01T08:00:00Z"),
  clientId: "peal-cli",
  lastUsedAt: at("2026-11-09T07:00:00Z"),
  name: "Peal CLI",
  scopes: ["offline_access", "workspace:read", "workspace:write"],
  uri: null,
  workspaces: [],
};

const exported = (exportedAt: DateTime.Utc): AccountExport => ({
  about: {
    categories: [],
    complaint: { authority: null, right: "Synthetic right to complain" },
    controller: null,
    language: "en",
    policyUrl: null,
    processors: null,
    recipients: [],
    rights: [],
  },
  activity: [],
  authoredPosts: [],
  connectedApps: [cli],
  contracts: { orders: [], requests: [], withdrawals: [] },
  exportedAt,
  invitations: { received: [], sent: [] },
  legalHold: null,
  memberships: [
    {
      joinedAt: at("2026-10-01T08:00:00Z"),
      role: "owner",
      workspaceId: studioId,
      workspaceName: "Studio",
    },
  ],
  notices: [],
  notificationPreferences: {
    email: {
      channelReconnect: true,
      comments: false,
      feedStopped: true,
      postFailed: true,
      postPublished: false,
      postReview: true,
      postUnconfirmed: true,
      recyclingEnded: true,
      webhookFailing: true,
      weeklyDigest: false,
    },
    everyPost: false,
  },
  replies: [],
  review: { approvals: [], comments: [] },
  sessions: [],
  signInMethods: [],
  staffActions: [],
  user: {
    createdAt: at("2026-10-01T08:00:00Z"),
    email: "synthetic@example.test",
    emailVerified: true,
    id: userId,
    image: null,
    locale: "en",
    name: "Synthetic User",
    twoStepEnabled: false,
    updatedAt: at("2026-10-01T08:00:00Z"),
  },
  workspaces: [],
});

export const readyMediaId = "0190f3a0-0000-7000-8000-00000000f001";

/** The host of the studio's media store, which signed requests go to. */
export const storeHost = "store.example.test";

/** The instant the studio takes for now: the tests' clock. */
export const studioNow = at("2026-11-09T12:00:00Z");

const image = (id: string, overrides: Partial<Media> = {}): Media => ({
  aiGenerated: false,
  altText: null,
  byteSize: 2048,
  codec: null,
  contentType: "image/png",
  createdAt: at("2026-11-05T10:00:00Z"),
  dimensions: { height: 600, width: 800 },
  durationMs: null,
  id,
  kind: "image",
  pageCount: null,
  status: { _tag: "ready" },
  updatedAt: at("2026-11-05T10:00:00Z"),
  url: `https://${storeHost}/read/${id}`,
  ...overrides,
});

/** A request the media store received. */
export interface StoredRequest {
  readonly byteSize: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly mediaId: string;
  readonly method: string;
  readonly part: string | null;
}

export const auditedKeyId = "3d6f0a1b-2c4e-4f5a-8b7c-9d0e1f2a3b4c";

/**
 * Studio's activity log, newest first: a draft an application made for the
 * user, a key refused, and a channel the user disconnected in the web app.
 */
export const activityLog: readonly ActivityEvent[] = [
  {
    actor: { _tag: "user", userId },
    application: { id: "peal-cli", name: "Peal CLI" },
    errorCode: null,
    id: "0190f3a0-0000-7000-8000-0000000a0003",
    impersonated: false,
    objectIds: {},
    occurredAt: at("2026-11-09T11:30:00Z"),
    operation: "posts.create",
    requestId: "0190f3a0-0000-7000-8000-0000000b0003",
    status: 201,
    via: "oauth",
  },
  {
    actor: { _tag: "apiKey", apiKeyId: auditedKeyId },
    application: { id: auditedKeyId, name: "ci" },
    errorCode: "forbidden",
    id: "0190f3a0-0000-7000-8000-0000000a0002",
    impersonated: false,
    objectIds: { postId: "0190f3a0-0000-7000-8000-00000000d002" },
    occurredAt: at("2026-11-09T10:15:00Z"),
    operation: "posts.schedule",
    requestId: "synthetic-request-0002",
    status: 403,
    via: "apiKey",
  },
  {
    actor: { _tag: "user", userId },
    application: null,
    errorCode: null,
    id: "0190f3a0-0000-7000-8000-0000000a0001",
    impersonated: false,
    objectIds: { channelId: "0190f3a0-0000-7000-8000-00000000c002" },
    occurredAt: at("2026-11-08T09:00:00Z"),
    operation: "channels.disconnect",
    requestId: null,
    status: 204,
    via: "session",
  },
];

export const hookId = "0190f3a0-0000-7000-8000-00000000b001";

export const failingHookId = "0190f3a0-0000-7000-8000-00000000b002";

export const pendingDeliveryId = "0190f3a0-0000-7000-8000-00000000f003";

export const deliveredId = "0190f3a0-0000-7000-8000-00000000f002";

export const exhaustedDeliveryId = "0190f3a0-0000-7000-8000-00000000f001";

/** Studio's endpoints: one that is on, one Peal turned off. */
export const webhooks: readonly WebhookEndpoint[] = [
  {
    channelIds: [],
    createdAt: at("2026-11-01T10:00:00Z"),
    description: "Synthetic receiver",
    disabledAt: null,
    disabledReason: null,
    enabled: true,
    eventTypes: ["post.published", "post.failed"],
    failingSince: at("2026-11-09T11:00:00Z"),
    headerNames: [],
    id: hookId,
    previousSecretExpiresAt: null,
    scope: "workspace",
    updatedAt: at("2026-11-01T10:00:00Z"),
    url: "https://hooks.example.com/peal",
    workspaceIds: [],
  },
  {
    channelIds: [],
    createdAt: at("2026-10-01T10:00:00Z"),
    description: "",
    disabledAt: at("2026-11-06T10:00:00Z"),
    disabledReason: "failing",
    enabled: false,
    eventTypes: ["media.ready"],
    failingSince: at("2026-11-01T10:00:00Z"),
    headerNames: [],
    id: failingHookId,
    previousSecretExpiresAt: null,
    scope: "workspace",
    updatedAt: at("2026-11-06T10:00:00Z"),
    url: "https://hooks.example.com/old",
    workspaceIds: [],
  },
];

/** A delivery, and the endpoint whose log holds it. */
export interface StudioDelivery {
  readonly delivery: WebhookDelivery;
  readonly endpointId: string;
}

const pendingDelivery = (
  id: string,
  eventId: string,
  eventType: WebhookEventType,
  endpointId = hookId
): WebhookDelivery => ({
  attempts: 0,
  completedAt: null,
  createdAt: at("2026-11-09T12:00:00Z"),
  durationMs: null,
  endpointId,
  error: null,
  eventId,
  eventType,
  failureReason: null,
  id,
  lastAttemptAt: null,
  nextAttemptAt: null,
  redeliveryOf: null,
  responseExcerpt: null,
  responseStatus: null,
  status: "pending",
  workspaceExternalId: null,
  workspaceId: studioId,
});

// The first endpoint's log, newest first.
const deliveries: readonly StudioDelivery[] = [
  {
    delivery: {
      ...pendingDelivery(
        pendingDeliveryId,
        "0190f3a0-0000-7000-8000-00000000ee03",
        "post.failed"
      ),
      attempts: 2,
      createdAt: at("2026-11-09T11:00:00Z"),
      durationMs: 187,
      lastAttemptAt: at("2026-11-09T11:00:05Z"),
      nextAttemptAt: at("2026-11-09T12:05:05Z"),
      responseExcerpt: "Internal Server Error",
      responseStatus: 500,
    },
    endpointId: hookId,
  },
  {
    delivery: {
      ...pendingDelivery(
        deliveredId,
        "0190f3a0-0000-7000-8000-00000000ee02",
        "post.published"
      ),
      attempts: 1,
      completedAt: at("2026-11-08T09:00:06Z"),
      createdAt: at("2026-11-08T09:00:05Z"),
      durationMs: 42,
      lastAttemptAt: at("2026-11-08T09:00:06Z"),
      responseStatus: 204,
      status: "succeeded",
    },
    endpointId: hookId,
  },
  {
    delivery: {
      ...pendingDelivery(
        exhaustedDeliveryId,
        "0190f3a0-0000-7000-8000-00000000ee01",
        "post.published"
      ),
      attempts: 8,
      completedAt: at("2026-11-07T09:00:00Z"),
      createdAt: at("2026-11-06T09:00:00Z"),
      durationMs: 15_000,
      error: "timeout",
      failureReason: "exhausted",
      lastAttemptAt: at("2026-11-07T09:00:00Z"),
      status: "failed",
    },
    endpointId: hookId,
  },
];

export const usedLinkId = "0190f3a0-0000-7000-8000-00000000c001";

export const newLinkId = "0190f3a0-0000-7000-8000-00000000c002";

/** The address the studio's new links open, shown once. */
export const newLinkUrl =
  "https://peal.example.test/connect/link#synthetic-token-0123456789abcdefghijklmnopq";

// A link used a day ago, which connected one channel.
const usedLink: ConnectLink = {
  channelId: null,
  channelIds: ["0190f3a0-0000-7000-8000-00000000d001"],
  completedAt: at("2026-11-08T10:00:00Z"),
  createdAt: at("2026-11-08T09:00:00Z"),
  expiresAt: at("2026-11-15T09:00:00Z"),
  failedAt: null,
  failure: null,
  id: usedLinkId,
  platform: "mastodon",
  returnUrl: "https://app.example.test/social",
  status: "completed",
};

/** The studio's partner account, and what it owns. */
export const studioPartner: Partner = {
  createdAt: at("2026-10-01T09:00:00Z"),
  id: "0190f3a0-0000-7000-8000-00000000e001",
  logoUrl: "https://cdn.example.test/logo.png",
  name: "Studio Suite",
  returnOrigins: ["https://app.example.test"],
  workspaceId: studioId,
};

const customers: readonly CustomerWorkspace[] = [
  {
    channels: 2,
    createdAt: at("2026-11-02T09:00:00Z"),
    externalId: "cus_002",
    id: "8e3f9a97-8a3c-4dab-8d85-6c4f5a7b8293",
    name: "Garage Dupont",
  },
  {
    channels: 1,
    createdAt: at("2026-11-01T09:00:00Z"),
    externalId: "cus_001",
    id: "7d2e8f86-7f2b-4c9a-9c74-5b3e4f6a7182",
    name: "Boulangerie Martin",
  },
];

// What needs attention in one of the partner's customers.
const healthOf = (
  customer: CustomerWorkspace | undefined,
  toReconnect: number,
  failed: number
): CustomerHealth => ({
  channels: { connected: customer?.channels ?? 0, off: 0, toReconnect },
  externalId: customer?.externalId ?? null,
  id: customer?.id ?? "",
  inbox: { unanswered: 0 },
  name: customer?.name ?? "",
  posts: {
    awaitingApproval: 0,
    failedLast7Days: failed,
    mayApprove: true,
    scheduledNext7Days: 0,
    unconfirmedLast7Days: 0,
  },
});

// What one of the partner's workspaces used over the period.
const tenantUsage = (
  workspaceId: string,
  name: string,
  externalId: string | null,
  connected: number,
  publishedPosts: number
): TenantUsage => ({
  assistantRequests: 0,
  byPlatform: [{ platform: "x", posts: publishedPosts }],
  channelDays: connected * 2,
  channels: connected,
  daysCounted: 2,
  externalId,
  home: workspaceId === studioId,
  mediaStorage: null,
  meteredPosts: [],
  name,
  publishedPosts,
  workspaceId,
});

/**
 * The studio's partner account's usage: its home and the newest customer
 * on the first page, the other on the next, which `before` names.
 */
const partnerUsageReport = (
  period: { readonly from: string; readonly to: string },
  before: string | undefined
): PartnerUsageReport => {
  const later = before === "studio-next-page";

  return {
    allowances: billing.allowances,
    current: later ? null : { channels: 5, workspaces: 2 },
    days: later
      ? null
      : [
          {
            byPlatform: [{ platform: "x", posts: 4 }],
            channels: 7,
            day: "2026-11-01",
            publishedPosts: 4,
            workspaces: 2,
          },
          {
            byPlatform: [{ platform: "bluesky", posts: 3 }],
            channels: 7,
            day: "2026-11-02",
            publishedPosts: 3,
            workspaces: 2,
          },
          {
            byPlatform: [],
            channels: null,
            day: "2026-11-03",
            publishedPosts: 0,
            workspaces: null,
          },
        ],
    period,
    plan: billing.plan,
    totals: later
      ? null
      : {
          billableAccountDays: null,
          byPlatform: [
            { platform: "bluesky", posts: 3 },
            { platform: "x", posts: 4 },
          ],
          channelDays: 14,
          daysCounted: 2,
          meteredPosts: [],
          publishedPosts: 7,
        },
    workspaces: later
      ? {
          next: null,
          total: 2,
          workspaces: [
            tenantUsage(
              customers[1]?.id ?? "",
              "Boulangerie Martin",
              "cus_001",
              1,
              2
            ),
          ],
        }
      : {
          next: "studio-next-page",
          total: 2,
          workspaces: [
            tenantUsage(studioId, "Studio", null, 2, 1),
            tenantUsage(
              customers[0]?.id ?? "",
              "Garage Dupont",
              "cus_002",
              2,
              4
            ),
          ],
        },
  };
};

/** What the instance holds, and what the commands changed. */
export interface StudioState {
  /** Its ad accounts and boosts, and what the server offers of ads. */
  readonly ads: AdsWorld;
  readonly approvals: readonly ApprovalRequest[];
  readonly changes: readonly string[];
  /** The studio's channels as they are now: named, turned off or on. */
  readonly channels: readonly Channel[];
  /** The workspace's channel sets, oldest first. */
  readonly channelSets: readonly StudioSet[];
  readonly comments: readonly ReviewComment[];
  /** The channels' default options, by channel. */
  readonly defaults: Readonly<Record<string, TargetOptions>>;
  readonly deliveries: readonly StudioDelivery[];
  /** Whether the studio holds more than its plan allows, as a test sets it. */
  readonly overPlan: boolean;
  /** Whether its new posts ask for short links unless they say. */
  readonly shortLinksByDefault: boolean;
  readonly invitations: readonly Invitation[];
  /** The workspace's connect links, newest first. */
  readonly connectLinks: readonly ConnectLink[];
  readonly links: readonly ReviewLink[];
  readonly media: readonly Media[];
  readonly policy: ApprovalPolicy;
  readonly posts: readonly Post[];
  /** The workspace's recycling rules, oldest first. */
  readonly recyclingRules: readonly RecyclingRule[];
  /** The web feeds the workspace follows, oldest first. */
  readonly feeds: readonly Feed[];
  /** The workspace's queues, oldest first. */
  readonly queues: readonly StudioQueue[];
  /** The posts made under an idempotency key, with the request's body. */
  readonly sent: Readonly<
    Record<string, { readonly body: string; readonly postId: string }>
  >;
  /** The workspace's signatures, oldest first. */
  readonly signatures: readonly Signature[];
  /** What the media store answers a signed request with. */
  readonly storeStatus: number;
  readonly stored: readonly StoredRequest[];
  /** The workspace's tags, oldest first. */
  readonly tags: readonly Tag[];
  /** Whether the server has the keys that encrypt signing secrets. */
  readonly signingKeys: boolean;
  readonly webhooks: readonly WebhookEndpoint[];
  /** The image provider the studio brought, and the key it was given. */
  readonly imageProvider: {
    readonly apiKey: string;
    readonly provider: ImageProvider;
  } | null;
  /** The text provider the studio brought, and the key it was given. */
  readonly textProvider: {
    readonly apiKey: string;
    readonly provider: TextProvider;
  } | null;
}

/** A synthetic API key of a workspace, with what it may do there. */
export interface StudioKey {
  readonly id: string;
  /** The secret a request sends as its bearer token. */
  readonly key: string;
  readonly permissions: readonly Permission[];
  readonly workspaceId: string;
}

/** The id of the request the studio refuses a key in, as the server names it. */
export const refusedRequestId = "0190f3a0-0000-7000-8000-0000000c0001";

// As the server words them (peal-server's refusals), with the envelope it
// fills on every error.
const keyWithout = (permission: Permission) =>
  new Forbidden({
    code: "forbidden",
    message: `This API key does not have the permission ${permission}. An owner or an admin of the workspace gives it to the key, or creates a key that has it.`,
    permission,
    reason: "missingPermission",
    requestId: refusedRequestId,
  });

const personRequired = new Forbidden({
  code: "forbidden",
  message:
    "Only a person signed in to Peal does this, in the web app: not an API key, an application acting for them, or staff acting as them.",
  reason: "personRequired",
  requestId: refusedRequestId,
});

const wrongWorkspace = new Forbidden({
  code: "forbidden",
  message:
    "This key or token belongs to another workspace: use it there, or use one of this workspace.",
  reason: "wrongWorkspace",
  requestId: refusedRequestId,
});

// What only a person does: an API key is nobody.
const inPerson = CurrentPrincipal.pipe(
  Effect.flatMap((principal) =>
    principal._tag === "apiKey" ? Effect.fail(personRequired) : Effect.void
  )
);

export interface Studio {
  readonly inbox: Ref.Ref<InboxState>;
  /** The API keys the server takes, beside the user's access token. */
  readonly keys: readonly StudioKey[];
  readonly me: Me;
  readonly state: Ref.Ref<StudioState>;
  /** What happens while the server answers an export, as a test sets it. */
  readonly whileExporting: Ref.Ref<Effect.Effect<void>>;
}

export const makeStudio = (
  me: Me = studioMe,
  keys: readonly StudioKey[] = []
) =>
  Effect.all({
    inbox: makeInbox,
    state: Ref.make<StudioState>({
      ads: adsWorld,
      approvals: [approval],
      changes: [],
      channelSets,
      channels,
      comments: [comment],
      connectLinks: [usedLink],
      defaults: {},
      deliveries,
      feeds: [],
      imageProvider: null,
      textProvider: null,
      invitations: [invitation],
      links: [],
      media: [image(readyMediaId, { altText: "A synthetic catalogue cover" })],
      overPlan: false,
      policy: "contributorsAndApplications",
      posts,
      queues: studioQueues(mastodonId),
      recyclingRules: [],
      sent: {},
      shortLinksByDefault: false,
      signatures,
      signingKeys: true,
      storeStatus: 200,
      stored: [],
      tags,
      webhooks,
    }),
    whileExporting: Ref.make<Effect.Effect<void>>(Effect.void),
  }).pipe(Effect.map((refs): Studio => ({ keys, me, ...refs })));

const record = (studio: Studio, change: string) =>
  Ref.update(studio.state, (current) => ({
    ...current,
    changes: [...current.changes, change],
  }));

// The actor an event names: the member's user id, or the key's id.
const actorIdOf = ({ actor }: ActivityEvent): string | null =>
  actor._tag === "apiKey" ? actor.apiKeyId : actor.userId;

// The studio's channel a path names.
const channelIn = (params: {
  readonly channelId: string;
  readonly workspaceId: string;
}) =>
  Option.match(
    Option.fromUndefinedOr(
      params.workspaceId === studioId
        ? channels.find(({ id }) => id === params.channelId)
        : undefined
    ),
    {
      onNone: () => Effect.fail(new ChannelNotFound()),
      onSome: (channel) => Effect.succeed(channel),
    }
  );

// The workspace's channels as they are now, oldest first.
const channelsNow = (studio: Studio, workspaceId: string) =>
  Ref.get(studio.state).pipe(
    Effect.map(({ channels: all }) => (workspaceId === studioId ? all : []))
  );

// How many of these channels are in each status.
const countsOf = (found: readonly Channel[]) => ({
  active: found.filter(({ status }) => status._tag === "active").length,
  disabled: found.filter(({ status }) => status._tag === "disabled").length,
  refreshNeeded: found.filter(({ status }) => status._tag === "refreshNeeded")
    .length,
});

// Whether a channel's handle or one of its names holds the text, whatever
// its case.
const holds = (channel: Channel, text: string): boolean =>
  [channel.handle, channel.displayName ?? "", channel.label ?? ""].some(
    (written) => written.toLowerCase().includes(text.toLowerCase())
  );

// A channel turned off keeps whether it must be reconnected, and has it
// again once turned back on.
const turnedOff = (channel: Channel): Channel =>
  channel.status._tag === "disabled"
    ? channel
    : {
        ...channel,
        status: {
          _tag: "disabled",
          refreshNeeded: channel.status._tag === "refreshNeeded",
        },
      };

const turnedOn = (channel: Channel): Channel =>
  channel.status._tag === "disabled"
    ? {
        ...channel,
        status: {
          _tag: channel.status.refreshNeeded ? "refreshNeeded" : "active",
        },
      }
    : channel;

// The member a request acts as, if they may do this. A key is told what
// it lacks, in the server's words.
const allowed = (permission: Permission) =>
  CurrentMember.pipe(
    Effect.flatMap((member) => {
      if (member.permissions.includes(permission)) {
        return Effect.succeed(member);
      }

      return Effect.fail(
        member.principal._tag === "apiKey"
          ? keyWithout(permission)
          : new Forbidden()
      );
    })
  );

// Names a channel, or turns it off or on, for a member who may connect
// channels; one already as asked is answered as it is, and nothing is
// recorded.
const changingChannel = (
  studio: Studio,
  params: { readonly channelId: string; readonly workspaceId: string },
  change: (channel: Channel) => Channel,
  what: string
) =>
  Effect.gen(function* changing() {
    yield* allowed("channel:connect");

    const found = (yield* channelsNow(studio, params.workspaceId)).find(
      ({ id }) => id === params.channelId
    );

    if (found === undefined) {
      return yield* new ChannelNotFound();
    }

    const next = change(found);

    if (next === found) {
      return found;
    }

    yield* Ref.update(studio.state, (current) => ({
      ...current,
      channels: current.channels.map((channel) =>
        channel.id === next.id ? next : channel
      ),
    }));
    yield* record(studio, `channel:${what}:${next.id}`);

    return next;
  });

const inStudio = (workspaceId: string) =>
  workspaceId === studioId ? Effect.void : Effect.fail(new PostNotFound());

const findPost = (studio: Studio, workspaceId: string, postId: string) =>
  inStudio(workspaceId).pipe(
    Effect.andThen(Ref.get(studio.state)),
    Effect.flatMap(({ posts: all }) =>
      Option.match(
        Option.fromUndefinedOr(all.find(({ id }) => id === postId)),
        {
          onNone: () => Effect.fail(new PostNotFound()),
          onSome: Effect.succeed,
        }
      )
    )
  );

const savePost = (studio: Studio, post: Post) =>
  Ref.update(studio.state, (current) => ({
    ...current,
    posts: current.posts.some(({ id }) => id === post.id)
      ? current.posts.map((found) => (found.id === post.id ? post : found))
      : [post, ...current.posts],
  })).pipe(Effect.as(post));

const changingTarget = (
  studio: Studio,
  {
    postId,
    targetId,
    workspaceId,
  }: Record<"postId" | "targetId" | "workspaceId", string>,
  change: (target: PostTarget) => Option.Option<PostTarget>
) =>
  Effect.gen(function* changing() {
    const post = yield* findPost(studio, workspaceId, postId);
    const target = post.targets.find(({ id }) => id === targetId);

    if (target === undefined) {
      return yield* new PostNotFound();
    }

    const changed = change(target);

    if (Option.isNone(changed)) {
      return yield* new TargetStatusConflict({ status: target.status });
    }

    return yield* savePost(studio, {
      ...post,
      targets: post.targets.map((found) =>
        found.id === targetId ? changed.value : found
      ),
    });
  });

// The scope an OAuth client needs to schedule, publish, move or cancel.
const publishScope = "workspace:publish";

// The member a request acts as, if their role lets them schedule, and the
// application they act through was allowed to.
const publishing = allowed("post:schedule").pipe(
  Effect.flatMap((member) =>
    member.principal._tag === "user" &&
    member.principal.oauth !== undefined &&
    !member.principal.oauth.scopes.includes(publishScope)
      ? Effect.fail(new Forbidden())
      : Effect.succeed(member)
  )
);

// The member a request acts as, if their role lets them publish, which
// unpublishing a live post takes, and the application they act through was
// allowed to.
const unpublishing = allowed("post:publish").pipe(
  Effect.flatMap((member) =>
    member.principal._tag === "user" &&
    member.principal.oauth !== undefined &&
    !member.principal.oauth.scopes.includes(publishScope)
      ? Effect.fail(new Forbidden())
      : Effect.succeed(member)
  )
);

// A change of a live post, as the studio answers it: its platform deletes
// at once.
const doneChange = (postId: string, target: PostTarget): LivePostChange => ({
  code: null,
  finishedAt: studioNow,
  id: `0190f3a0-0000-7000-8000-${target.id.slice(-12)}`,
  kind: "unpublish",
  partsLeft: 0,
  postId,
  requestedAt: studioNow,
  status: "done",
  targetId: target.id,
});

// Deletes the target from its synthetic platform, or why it cannot be.
const unpublishedOn = (
  target: PostTarget
): Result.Result<PostTarget, LivePostRefusal> => {
  if (target.status !== "published") {
    return Result.fail("notPublished");
  }

  return target.removedAt === null
    ? Result.succeed({ ...target, removedAt: studioNow })
    : Result.fail("alreadyRemoved");
};

// The platforms whose posts the studio edits once live, as the server's.
const editingPlatforms: ReadonlySet<string> = new Set([
  "mastodon",
  "googleBusiness",
]);

// Why the studio does not edit the part of the target, if it does not.
const editRefusal = (
  target: PostTarget,
  platform: string | undefined,
  part: number
): LivePostRefusal | undefined => {
  if (target.status !== "published") {
    return "notPublished";
  }

  if (target.removedAt !== null) {
    return "alreadyRemoved";
  }

  if (platform === undefined || !editingPlatforms.has(platform)) {
    return "notSupported";
  }

  return part < target.parts.count ? undefined : "noPlatformId";
};

// The post with `text` as the channel's own on the part at `part`.
const withTextOn = (
  post: Post,
  part: number,
  channelId: string,
  text: string
): Post => {
  const overridden = (
    overrides: readonly { readonly channelId: string; readonly text: string }[]
  ) => [
    ...overrides.filter((override) => override.channelId !== channelId),
    { channelId, text },
  ];

  return part === 0
    ? {
        ...post,
        content: {
          ...post.content,
          overrides: overridden(post.content.overrides),
        },
      }
    : {
        ...post,
        content: {
          ...post.content,
          followUps: (post.content.followUps ?? []).map((followUp, index) =>
            index + 1 === part
              ? { ...followUp, overrides: overridden(followUp.overrides) }
              : followUp
          ),
        },
      };
};

// Posts scheduled through the command line say so.
const viaCommandLine: PostOrigin = {
  id: "peal-cli",
  name: "Peal CLI",
  via: "application",
};

const aMinute = 60_000;

// A time and its zone, as scheduling checks them.
const checkTime = (when: DateTime.Utc, timeZone: string) =>
  Effect.gen(function* checking() {
    if (Option.isNone(DateTime.zoneMakeNamed(timeZone))) {
      return yield* new InvalidTimeZone({ timeZone });
    }

    if (
      DateTime.toEpochMillis(when) <
      DateTime.toEpochMillis(studioNow) - aMinute
    ) {
      return yield* new ScheduleInPast();
    }

    // A time within the minute goes out now.
    return DateTime.toEpochMillis(when) <=
      DateTime.toEpochMillis(studioNow) + aMinute
      ? ("publishing" as const)
      : ("scheduled" as const);
  });

const checkChannels = (channelIds: readonly string[]) => {
  const unknown = channelIds.filter(
    (channelId) => !channels.some(({ id }) => id === channelId)
  );

  return unknown.length === 0
    ? Effect.void
    : Effect.fail(new UnknownChannels({ channelIds: unknown }));
};

// The tags a post names must be the workspace's.
const checkTags = (studio: Studio, tagIds: readonly string[]) =>
  Ref.get(studio.state).pipe(
    Effect.flatMap(({ tags: all }) => {
      const unknown = tagIds.filter(
        (tagId) => !all.some(({ id }) => id === tagId)
      );

      return unknown.length === 0
        ? Effect.void
        : Effect.fail(new UnknownTags({ tagIds: unknown }));
    })
  );

// The studio's tag a path names.
const findTag = (
  studio: Studio,
  params: { readonly tagId: string; readonly workspaceId: string }
) =>
  Ref.get(studio.state).pipe(
    Effect.flatMap(({ tags: all }) =>
      Option.match(
        Option.fromUndefinedOr(
          params.workspaceId === studioId
            ? all.find(({ id }) => id === params.tagId)
            : undefined
        ),
        {
          onNone: () => Effect.fail(new TagNotFound()),
          onSome: (tag) => Effect.succeed(tag),
        }
      )
    )
  );

// A name another tag of the workspace has, whatever its case.
const checkTagName = (studio: Studio, name: string, but?: string) =>
  Ref.get(studio.state).pipe(
    Effect.flatMap(({ tags: all }) =>
      all.some(
        (tag) => tag.id !== but && tag.name.toLowerCase() === name.toLowerCase()
      )
        ? Effect.fail(new TagNameTaken())
        : Effect.void
    )
  );

const isConnected = (channelId: string): boolean =>
  channels.some(({ id }) => id === channelId);

// A set as the API answers it: with those of its channels disconnected
// since.
const setView = (set: StudioSet): ChannelSet => ({
  ...set,
  unavailableChannelIds: set.channelIds.filter(
    (channelId) => !isConnected(channelId)
  ),
});

// Options are of their channel's own platform.
const checkOptions = (given: readonly ChannelOptions[]) => {
  const violations = given.flatMap(
    ({ channelId, options }): ContentViolation[] => {
      const channel = channels.find(({ id }) => id === channelId);

      return channel === undefined || channel.platform === options.platform
        ? []
        : [
            {
              _tag: "optionsForOtherPlatform",
              channelId,
              optionsPlatform: options.platform,
              platform: channel.platform,
            },
          ];
    }
  );

  return violations.length === 0
    ? Effect.void
    : Effect.fail(new PostContentInvalid({ violations }));
};

// Where a signature is meant for, in a word.
const scopeKey = (scope: SignatureScope): string => {
  if (scope._tag === "platform") {
    return `platform:${scope.platform}`;
  }

  return scope._tag === "channel" ? `channel:${scope.channelId}` : "workspace";
};

// The studio's signature a path names.
const findSignature = (
  studio: Studio,
  params: { readonly signatureId: string; readonly workspaceId: string }
) =>
  Ref.get(studio.state).pipe(
    Effect.flatMap(({ signatures: all }) =>
      Option.match(
        Option.fromUndefinedOr(
          params.workspaceId === studioId
            ? all.find(({ id }) => id === params.signatureId)
            : undefined
        ),
        {
          onNone: () => Effect.fail(new SignatureNotFound()),
          onSome: (signature) => Effect.succeed(signature),
        }
      )
    )
  );

// A signature as a request writes it, once it may be kept: its channel is
// the workspace's, and no other signature has its name, whatever its case.
const checkSignature = (
  studio: Studio,
  details: { readonly name: string; readonly scope?: SignatureScope },
  but?: string
) =>
  Effect.gen(function* checkingSignature() {
    const scope = details.scope ?? { _tag: "workspace" };

    if (scope._tag === "channel" && !isConnected(scope.channelId)) {
      return yield* new UnknownChannels({ channelIds: [scope.channelId] });
    }

    const { signatures: all } = yield* Ref.get(studio.state);

    if (
      all.some(
        (signature) =>
          signature.id !== but &&
          signature.name.toLowerCase() === details.name.toLowerCase()
      )
    ) {
      return yield* new SignatureNameTaken();
    }

    return scope;
  });

// The signatures with this one among them: a default is the only one of
// its scope.
const withSignature = (
  all: readonly Signature[],
  kept: Signature
): Signature[] => {
  const beside = (other: Signature): Signature =>
    kept.isDefault && scopeKey(other.scope) === scopeKey(kept.scope)
      ? { ...other, isDefault: false }
      : other;

  return all.some(({ id }) => id === kept.id)
    ? all.map((found) => (found.id === kept.id ? kept : beside(found)))
    : [...all.map(beside), kept];
};

// The studio's channel set a path names.
const findSet = (
  studio: Studio,
  params: { readonly channelSetId: string; readonly workspaceId: string }
) =>
  Ref.get(studio.state).pipe(
    Effect.flatMap(({ channelSets: all }) =>
      Option.match(
        Option.fromUndefinedOr(
          params.workspaceId === studioId
            ? all.find(({ id }) => id === params.channelSetId)
            : undefined
        ),
        {
          onNone: () => Effect.fail(new ChannelSetNotFound()),
          onSome: (set) => Effect.succeed(set),
        }
      )
    )
  );

// A set as a request writes it, once it may be kept: its channels are
// connected, its options theirs, and no other set has its name.
const checkSet = (
  studio: Studio,
  details: {
    readonly channelIds: readonly string[];
    readonly name: string;
    readonly options?: readonly ChannelOptions[];
  },
  but?: string
) =>
  Effect.gen(function* checkingSet() {
    yield* checkChannels(details.channelIds);
    yield* checkOptions(details.options ?? []);

    const { channelSets: all } = yield* Ref.get(studio.state);

    yield* all.some(
      (set) =>
        set.id !== but && set.name.toLowerCase() === details.name.toLowerCase()
    )
      ? Effect.fail(new ChannelSetNameTaken())
      : Effect.void;
  });

// The set a post names, by its id or its name, whatever its case.
const setNamed = (all: readonly StudioSet[], reference: string) =>
  all.find(
    (set) =>
      set.id === reference || set.name.toLowerCase() === reference.toLowerCase()
  );

/** What a post asks of what the studio saved. */
interface Asking {
  readonly channelIds: readonly string[];
  readonly channelSets?: readonly string[];
  readonly content: PostContent;
  readonly defaultSignatures?: boolean;
  readonly options?: readonly ChannelOptions[];
  readonly signatureId?: string;
}

// A post once everything it names is filled in, as the server fills it:
// the connected channels of its sets, with a warning for those that are
// gone; on a channel without options, a set's, then for a new post the
// channel's defaults; and its signatures under its text, never twice. Of
// the default signatures, the studio adds the workspace's.
const filled = <P extends Asking>(studio: Studio, asked: P, fresh: boolean) =>
  Effect.gen(function* filling() {
    const state = yield* Ref.get(studio.state);
    const named: StudioSet[] = [];

    for (const reference of asked.channelSets ?? []) {
      const set = setNamed(state.channelSets, reference);

      if (set === undefined) {
        return yield* new ChannelSetNotFound();
      }

      named.push(set);
    }

    const warnings = named.flatMap((set): PostWarning[] => {
      const gone = setView(set).unavailableChannelIds;

      return gone.length === 0
        ? []
        : [
            {
              _tag: "channelsDropped",
              channelIds: gone,
              channelSetId: set.id,
              channelSetName: set.name,
            },
          ];
    });

    const channelIds = [
      ...new Set([
        ...asked.channelIds,
        ...named.flatMap((set) => set.channelIds.filter(isConnected)),
      ]),
    ];

    const given = asked.options ?? [];
    const kept = named.flatMap((set) => set.options);

    const saved = channelIds.flatMap((channelId): ChannelOptions[] => {
      const own = state.defaults[channelId];

      const chosen =
        kept.find((options) => options.channelId === channelId) ??
        (fresh && own !== undefined ? { channelId, options: own } : undefined);

      return chosen === undefined ||
        given.some((options) => options.channelId === channelId)
        ? []
        : [chosen];
    });

    const signature =
      asked.signatureId === undefined
        ? Option.none<Signature>()
        : Option.fromUndefinedOr(
            state.signatures.find(({ id }) => id === asked.signatureId)
          );

    if (asked.signatureId !== undefined && Option.isNone(signature)) {
      return yield* new SignatureNotFound();
    }

    const under = [
      ...Option.toArray(signature),
      ...(asked.defaultSignatures === true
        ? state.signatures.filter(
            ({ isDefault, scope }) => isDefault && scope._tag === "workspace"
          )
        : []),
    ];

    let { text } = asked.content;

    for (const added of under) {
      text = signedText(text, added.text);
    }

    return {
      post: {
        ...asked,
        channelIds,
        content: { ...asked.content, text },
        options: [...given, ...saved],
      },
      warnings,
    };
  });

const noWarnings: readonly PostWarning[] = [];

// A post as the request that made it is answered: with what it should
// know of, when there is something to say.
const told = (post: Post, warnings: readonly PostWarning[]): Post =>
  warnings.length === 0 ? post : { ...post, warnings };

const mastodonLimit = 500;

// What the platforms of a post's channels refuse, every violation at once:
// Mastodon's text limit, a post with nothing in it, YouTube's title.
const violationsOf = (
  channelIds: readonly string[],
  postContent: PostContent,
  options: readonly ChannelOptions[]
): ContentViolation[] =>
  channelIds.flatMap((channelId): ContentViolation[] => {
    const channel = channels.find(({ id }) => id === channelId);

    if (channel === undefined) {
      return [];
    }

    const on = { channelId, platform: channel.platform };
    const { length } = postContent.text;

    return [
      length === 0 && postContent.media.length === 0
        ? [{ _tag: "empty" as const, ...on }]
        : [],
      channel.platform === "mastodon" && length > mastodonLimit
        ? [
            {
              _tag: "textTooLong" as const,
              ...on,
              length,
              maximum: mastodonLimit,
              unit: "utf16Units" as const,
            },
          ]
        : [],
      channel.platform === "youtube" &&
      !options.some((chosen) => chosen.channelId === channelId)
        ? [{ _tag: "optionMissing" as const, ...on, field: "title" }]
        : [],
    ].flat();
  });

const checkContent = (
  channelIds: readonly string[],
  postContent: PostContent,
  options: readonly ChannelOptions[]
) => {
  const violations = violationsOf(channelIds, postContent, options);

  return violations.length === 0
    ? Effect.void
    : Effect.fail(new PostContentInvalid({ violations }));
};

const checkMedia = (studio: Studio, postContent: PostContent) =>
  Ref.get(studio.state).pipe(
    Effect.flatMap(({ media }) => {
      const unknown = postContent.media
        .map(({ mediaId }) => mediaId)
        .filter(
          (mediaId) =>
            !media.some(
              ({ id, status }) => id === mediaId && status._tag === "ready"
            )
        );

      return unknown.length === 0
        ? Effect.void
        : Effect.fail(new UnknownMedia({ mediaIds: unknown }));
    })
  );

const optionsOn = (post: Post): ChannelOptions[] =>
  post.targets.flatMap(({ channelId, options }) =>
    options === null ? [] : [{ channelId, options }]
  );

const nextId = (kind: "a" | "d" | "f", count: number) =>
  `0190f3a0-0000-7000-8000-${kind}${String(count + 1).padStart(11, "0")}`;

const storedTypes: readonly MediaContentType[] = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
];

const isStoredType = (contentType: string): contentType is MediaContentType =>
  storedTypes.some((stored) => stored === contentType);

const maxImageBytes = 16 * 1024 * 1024;

// Videos go in parts of four bytes, so a test's small file has several.
const partSize = 4;

const signature = "signature=synthetic-signature";

const signed = (
  mediaId: string,
  headers: Record<string, string>,
  part: number | null
): SignedRequest => ({
  headers,
  method: "PUT",
  url: `https://${storeHost}/media/${mediaId}?${part === null ? "" : `partNumber=${String(part)}&`}${signature}`,
});

const findMedia = (studio: Studio, mediaId: string) =>
  Ref.get(studio.state).pipe(
    Effect.flatMap(({ media }) =>
      Option.match(
        Option.fromUndefinedOr(media.find(({ id }) => id === mediaId)),
        {
          onNone: () => Effect.fail(new MediaNotFound()),
          onSome: Effect.succeed,
        }
      )
    )
  );

const saveMedia = (studio: Studio, saved: Media) =>
  Ref.update(studio.state, (current) => ({
    ...current,
    media: current.media.some(({ id }) => id === saved.id)
      ? current.media.map((found) => (found.id === saved.id ? saved : found))
      : [saved, ...current.media],
  })).pipe(Effect.as(saved));

/**
 * The media store: takes what a signed request sends, and remembers its
 * headers, so a test sees what reached it. It answers `storeStatus`.
 */
export const storePut = async (
  studio: Studio,
  request: Request
): Promise<Response> => {
  const address = new URL(request.url);
  const body = await request.arrayBuffer();

  return await Effect.runPromise(
    Ref.modify(studio.state, (current): [Response, StudioState] => [
      new Response(null, { status: current.storeStatus }),
      {
        ...current,
        stored: [
          ...current.stored,
          {
            byteSize: body.byteLength,
            headers: Object.fromEntries(request.headers),
            mediaId: address.pathname.split("/").at(-1) ?? "",
            method: request.method,
            part: address.searchParams.get("partNumber"),
          },
        ],
      },
    ])
  );
};

const refusing = Effect.fail(new Unauthenticated());

// A draft's targets, with the options the request gives each channel.
const targetsOf = (postId: string, draft: PostDraft) =>
  draft.channelIds.map((channelId, index): PostTarget => ({
    ...pendingOn(`${postId}-${String(index)}`, channelId),
    options:
      draft.options?.find((chosen) => chosen.channelId === channelId)
        ?.options ?? null,
  }));

// Why the studio refuses an address, as the server's rules would: HTTPS on
// the default port, without credentials, on a host that is public. Its
// stand-ins for what only a lookup tells are a loopback name and the
// reserved `.invalid` names.
const refusalOf = (address: string): Option.Option<WebhookUrlRefusal> => {
  if (!URL.canParse(address)) {
    return Option.some("malformed");
  }

  const url = new URL(address);

  if (url.protocol !== "https:" || url.port !== "") {
    return Option.some("notHttps");
  }

  if (url.username !== "" || url.password !== "") {
    return Option.some("credentials");
  }

  if (url.hostname === "localhost") {
    return Option.some("notPublic");
  }

  return url.hostname.endsWith(".invalid")
    ? Option.some("unknownHost")
    : Option.none();
};

const acceptedUrl = (address: string) =>
  Option.match(refusalOf(address), {
    onNone: () => Effect.void,
    onSome: (reason) => Effect.fail(new WebhookUrlRefused({ reason })),
  });

// Each synthetic secret says which it is: the first issued, the second...
const secrets = [
  "whsec_c3ludGhldGljLXNlY3JldC0x",
  "whsec_c3ludGhldGljLXNlY3JldC0y",
  "whsec_c3ludGhldGljLXNlY3JldC0z",
];

// The secret for a change, by how many were made before it.
const secretAfter = (changes: readonly string[]): string =>
  secrets[
    changes.filter((change) => change.startsWith("webhook:secret:")).length %
      secrets.length
  ] ?? "";

const findEndpoint = (
  studio: Studio,
  workspaceId: string,
  endpointId: string
) =>
  Ref.get(studio.state).pipe(
    Effect.flatMap(({ webhooks: all }) =>
      Option.match(
        Option.fromUndefinedOr(
          workspaceId === studioId
            ? all.find(({ id }) => id === endpointId)
            : undefined
        ),
        {
          onNone: () => Effect.fail(new WebhookEndpointNotFound()),
          onSome: Effect.succeed,
        }
      )
    )
  );

const saveEndpoint = (studio: Studio, endpoint: WebhookEndpoint) =>
  Ref.update(studio.state, (current) => ({
    ...current,
    webhooks: current.webhooks.some(({ id }) => id === endpoint.id)
      ? current.webhooks.map((found) =>
          found.id === endpoint.id ? endpoint : found
        )
      : [...current.webhooks, endpoint],
  })).pipe(Effect.as(endpoint));

// A new delivery of the event to the endpoint, at the top of its log.
// A page of deliveries, newest first, filtered as a log is.
const pageOf = (
  listed: readonly WebhookDelivery[],
  query: {
    readonly cursor?: string;
    readonly eventType?: WebhookEventType;
    readonly limit?: number;
    readonly status?: WebhookDelivery["status"];
  }
) => {
  const matching = listed.filter(
    ({ eventType, status }) =>
      (query.status === undefined || status === query.status) &&
      (query.eventType === undefined || eventType === query.eventType)
  );

  const start =
    query.cursor === undefined
      ? 0
      : matching.findIndex(({ id }) => id === query.cursor) + 1;

  const limit = query.limit ?? 30;
  const items = matching.slice(start, start + limit);
  const last = items.at(-1);

  return {
    items,
    nextCursor:
      last !== undefined && start + limit < matching.length ? last.id : null,
  };
};

const deliverTo = (
  studio: Studio,
  endpoint: WebhookEndpoint,
  event: { readonly id: string; readonly type: WebhookEventType },
  redeliveryOf: string | null = null
) =>
  Effect.gen(function* delivering() {
    if (!endpoint.enabled) {
      return yield* new WebhookEndpointDisabled();
    }

    const { deliveries: all } = yield* Ref.get(studio.state);

    const delivery = {
      ...pendingDelivery(
        `0190f3a0-0000-7000-8000-00000000f${String(all.length + 1).padStart(3, "0")}`,
        event.id,
        event.type,
        endpoint.id
      ),
      redeliveryOf,
    };

    yield* Ref.update(studio.state, (current) => ({
      ...current,
      deliveries: [{ delivery, endpointId: endpoint.id }, ...all],
    }));

    return delivery;
  });

// The same words to the same channel again, from a post that still goes
// out, is a mistake unless meant.
const duplicatesOf = (
  all: readonly Post[],
  payload: Pick<NewPost, "allowDuplicate" | "content"> & {
    readonly channelIds: readonly string[];
  },
  near: DateTime.Utc
): DuplicateOnChannel[] =>
  payload.allowDuplicate === true
    ? []
    : payload.channelIds.flatMap((channelId) =>
        all
          .filter(
            (other) =>
              other.status !== "draft" &&
              other.status !== "cancelled" &&
              other.schedule !== null &&
              // Less than the window from this one's time, either way.
              Math.abs(
                DateTime.toEpochMillis(other.schedule.at) -
                  DateTime.toEpochMillis(near)
              ) <
                duplicateWindowHours * 3_600_000 &&
              other.content.text === payload.content.text &&
              other.targets.some((target) => target.channelId === channelId)
          )
          .slice(0, 1)
          .map((other) => ({ channelId, postId: other.id }))
      );

// The studio's recycling rules, over its posts.
const recyclingOfStudio = studioRecyclingOf({
  allowed,
  now: studioNow,
  record,
  workspaceId: studioId,
});

// The studio's feeds.
const feedsOfStudio = studioFeedsOf({
  allowed,
  now: studioNow,
  record,
  workspaceId: studioId,
});

// The studio's queues, over what the rest of it holds.
const queuesOfStudio = studioQueuesOf({
  allowed,
  checkChannels,
  isConnected,
  now: studioNow,
  record,
  setIds: [launchSetId, videosSetId],
  workspaceId: studioId,
});

// A new post's time: now is the studio's clock. A post added to a queue
// has its slot's by the time it is checked (`placed`).
const timeOf = ({ when }: Pick<NewPost, "when">) => {
  if (when._tag === "at") {
    return { at: when.at, timeZone: when.timeZone };
  }

  return {
    at: studioNow,
    timeZone: when._tag === "now" ? (when.timeZone ?? "UTC") : "UTC",
  };
};

// A post added to a queue, as the studio places it: on the queue's next
// free slot, in its zone, and on its channels when it names none.
const placed = (studio: Studio, payload: NewPost) =>
  Effect.gen(function* placing() {
    const { when } = payload;

    if (when._tag !== "queue") {
      return { payload, queueId: null };
    }

    const queue = yield* queuesOfStudio.queueFor(
      studio,
      studioId,
      when.queueId
    );

    const slot = yield* queuesOfStudio.nextFreeOf(studio, queue);

    if (Option.isNone(slot)) {
      return yield* new QueueHasNoRoom({
        queueId: queue.id,
        reason: queue.slots.length === 0 ? "noSlots" : "full",
      });
    }

    const namesNone =
      payload.channelIds.length === 0 &&
      (payload.channelSets ?? []).length === 0;

    const onSlot: NewPost = {
      ...payload,
      channelIds: namesNone ? queue.channelIds : payload.channelIds,
      when: { _tag: "at", at: slot.value, timeZone: queue.timeZone },
    };

    return { payload: onSlot, queueId: queue.id };
  });

// Everything sending a post checks before making it, in the order the
// server answers: its channels, its media, its time, what its platforms
// refuse, and the posts that already send it.
const checkNewPost = (studio: Studio, asked: NewPost) =>
  Effect.gen(function* checkingNewPost() {
    const { post: payload, warnings } = yield* filled(studio, asked, true);

    yield* checkChannels(payload.channelIds);

    // A set none of whose channels is left, and no other channel.
    if (payload.channelIds.length === 0) {
      return yield* new UnknownChannels({
        channelIds: warnings.flatMap(({ channelIds }) => channelIds),
      });
    }

    yield* checkMedia(studio, payload.content);
    yield* checkTags(studio, payload.tagIds ?? []);

    const when = timeOf(payload);
    const status = yield* checkTime(when.at, when.timeZone);

    yield* checkContent(
      payload.channelIds,
      payload.content,
      payload.options ?? []
    );

    const { posts: all } = yield* Ref.get(studio.state);
    const duplicates = duplicatesOf(all, payload, timeOf(payload).at);

    if (duplicates.length > 0) {
      return yield* new DuplicatePost({ duplicates });
    }

    return { payload, status, warnings, when };
  });

// The post a first request made under the key, if one did: the same key
// with another body is refused.
const madeUnder = (studio: Studio, payload: NewPost, key: string | undefined) =>
  Effect.gen(function* findingFirst() {
    const { sent } = yield* Ref.get(studio.state);
    const first = key === undefined ? undefined : sent[key];

    if (first === undefined) {
      return Option.none<string>();
    }

    return first.body === JSON.stringify(payload)
      ? Option.some(first.postId)
      : yield* new IdempotencyKeyReused();
  });

// Makes a post as `send` does, under its idempotency key if it has one:
// the same key answers the post its first request made, as it now stands,
// and makes no other.
const makePost = (studio: Studio, payload: NewPost, key: string | undefined) =>
  Effect.gen(function* making() {
    const first = yield* madeUnder(studio, payload, key);

    if (Option.isSome(first)) {
      return {
        post: yield* findPost(studio, studioId, first.value),
        replayed: true,
        warnings: noWarnings,
      };
    }

    const body = JSON.stringify(payload);
    const before = yield* Ref.get(studio.state);
    const onQueue = yield* placed(studio, payload);
    const checked = yield* checkNewPost(studio, onQueue.payload);
    const { payload: written, warnings, when } = checked;

    // Where every post waits, this one does: nothing goes out.
    const status =
      before.policy === "always"
        ? ("awaitingApproval" as const)
        : checked.status;

    const id = nextId("d", before.posts.length);

    yield* Ref.update(studio.state, (current) => ({
      ...current,
      sent:
        key === undefined
          ? current.sent
          : { ...current.sent, [key]: { body, postId: id } },
    }));
    yield* record(studio, `send:${id}:${payload.when._tag}:${key ?? "no key"}`);

    const post = yield* savePost(studio, {
      authorId: userId,
      content: written.content,
      createdVia: viaCommandLine,
      id,
      occurrence: null,
      outcome: null,
      queueId: onQueue.queueId,
      recyclingId: null,
      schedule: when,
      scheduledBy: userId,
      scheduledVia: viaCommandLine,
      shortenLinks: payload.shortenLinks ?? before.shortLinksByDefault,
      status,
      tagIds: payload.tagIds ?? [],
      targets: targetsOf(id, written),
    });

    return { post, replayed: false, warnings };
  });

// How a post ended, by how many of its channels have it.
const outcomeOf = (targets: readonly PostTarget[]) => {
  const published = targets.filter(
    ({ status }) => status === "published"
  ).length;

  if (published === targets.length) {
    return "published" as const;
  }

  return published === 0
    ? ("failed" as const)
    : ("partiallyPublished" as const);
};

// A target once its platform answered: published, with its address, unless
// its channel must be reconnected, which fails it.
const settledOn = (target: PostTarget): PostTarget => {
  const channel = channels.find(({ id }) => id === target.channelId);

  if (target.status !== "pending" && target.status !== "publishing") {
    return target;
  }

  return channel === undefined || channel.status._tag !== "active"
    ? { ...target, failureReason: "tokenExpired", status: "failed" }
    : {
        ...target,
        permalink:
          channel.platform === "mastodon"
            ? `https://social.example.test/@studio/${target.id}`
            : `https://${channel.platform}.example.test/posts/${target.id}`,
        publishedAt: studioNow,
        status: "published",
      };
};

// The synthetic platforms answer within a second: a post that is going out
// has finished for whoever waits that long.
const afterWaiting = (studio: Studio, post: Post, wait: number | undefined) =>
  Effect.gen(function* settling() {
    if (post.status !== "publishing" || wait === undefined || wait < 1) {
      return post;
    }

    const targets = post.targets.map(settledOn);

    yield* record(studio, `settle:${post.id}`);

    return yield* savePost(studio, {
      ...post,
      outcome: outcomeOf(targets),
      status: "finished",
      targets,
    });
  });

// Whether a post's time can be kept, as `validate` answers it.
const scheduleCheck = (payload: Pick<NewPost, "when">) => {
  const when = timeOf(payload);

  return checkTime(when.at, when.timeZone).pipe(
    Effect.as<ScheduleCheck>("ok"),
    Effect.catchTags({
      InvalidTimeZone: () => Effect.succeed<ScheduleCheck>("invalidTimeZone"),
      ScheduleInPast: () => Effect.succeed<ScheduleCheck>("inPast"),
    })
  );
};

// A part's text on a channel and what it holds, counted as its platform
// counts it.
const countsOn = (
  channel: Channel,
  part: Pick<PostContent, "media" | "overrides" | "text">
) => {
  const rules = platformRules[channel.platform];

  const text =
    part.overrides.find(({ channelId }) => channelId === channel.id)?.text ??
    part.text;

  return {
    hashtags: {
      count: countHashtags(text),
      maximum: rules.maxHashtags ?? null,
    },
    links: { count: countLinks(text), maximum: rules.maxLinks ?? null },
    media: { count: part.media.length, maximum: rules.maxMedia ?? null },
    mentions: {
      count: countMentions(text),
      maximum: rules.maxMentions ?? null,
    },
    text,
    textCounts: rules.textLimits.map(({ maximum, unit }) => ({
      length: measureText(text, unit),
      maximum,
      unit,
    })),
  };
};

// What a post would be on one channel: its first part, then the others.
const previewOn = (
  channel: Channel,
  postContent: PostContent,
  options: readonly ChannelOptions[]
): ChannelPreview => ({
  ...countsOn(channel, postContent),
  channelId: channel.id,
  parts: (postContent.followUps ?? []).map((part, index) => ({
    ...countsOn(channel, part),
    part: index + 1,
  })),
  platform: channel.platform,
  violations: violationsOf([channel.id], postContent, options),
});

const unknownMediaOf = (studio: Studio, postContent: PostContent) =>
  checkMedia(studio, postContent).pipe(
    Effect.as<readonly string[]>([]),
    Effect.catchTag("UnknownMedia", ({ mediaIds }) => Effect.succeed(mediaIds))
  );

// A cursor is the id of the last post of the page before.
const pageFrom = (listed: readonly Post[], cursor: string | undefined) => {
  if (cursor === undefined) {
    return Effect.succeed(listed);
  }

  const index = listed.findIndex(({ id }) => id === cursor);

  return index === -1
    ? Effect.fail(new HttpApiError.BadRequest())
    : Effect.succeed(listed.slice(index + 1));
};

const scheduledAt = (post: Post): number =>
  post.schedule === null ? 0 : DateTime.toEpochMillis(post.schedule.at);

// The studio keeps its posts newest first.
const sorted = (all: readonly Post[], sort: PostSort): readonly Post[] => {
  const timed = all.filter(({ schedule }) => schedule !== null);

  const orders: Readonly<Record<PostSort, () => readonly Post[]>> = {
    createdAsc: () => all.toReversed(),
    createdDesc: () => all,
    scheduledAsc: () =>
      timed.toSorted((one, other) => scheduledAt(one) - scheduledAt(other)),
    scheduledDesc: () =>
      timed.toSorted((one, other) => scheduledAt(other) - scheduledAt(one)),
  };

  return orders[sort]();
};

// Whether a post has a target on a channel of the platform.
const isOnPlatform = (post: Post, platform: string): boolean =>
  post.targets.some(({ channelId }) =>
    channels.some(
      (channel) => channel.id === channelId && channel.platform === platform
    )
  );

// Whether a post's time is in the range: one without a time never is.
const isWithin = (
  post: Post,
  from: DateTime.Utc | undefined,
  to: DateTime.Utc | undefined
): boolean => {
  if (from === undefined && to === undefined) {
    return true;
  }

  if (post.schedule === null) {
    return false;
  }

  const instant = scheduledAt(post);

  return (
    (from === undefined || instant >= DateTime.toEpochMillis(from)) &&
    (to === undefined || instant < DateTime.toEpochMillis(to))
  );
};

// A cell of a CSV file, bare or between double quotes, and what ends it.
const cellPattern =
  /(?:"(?<quoted>(?:[^"]|"")*)"|(?<bare>[^",\r\n]*))(?<end>,|\r?\n|$)/gu;

// The rows of a CSV file, each a list of cells; none when a quoted cell
// never ends. Empty lines are no rows.
const csvRows = (csv: string): Option.Option<string[][]> => {
  const rows: string[][] = [[]];
  let read = 0;

  for (const match of csv.matchAll(cellPattern)) {
    // A gap is a quote the pattern could not close.
    if (match.index !== read) {
      return Option.none();
    }

    read += match[0].length;

    const quoted = match.groups?.["quoted"];

    rows
      .at(-1)
      ?.push(
        quoted === undefined
          ? (match.groups?.["bare"] ?? "")
          : quoted.replaceAll('""', '"')
      );

    if (match.groups?.["end"] !== ",") {
      rows.push([]);
    }
  }

  return read === csv.length
    ? Option.some(rows.filter((row) => row.length > 1 || (row[0] ?? "") !== ""))
    : Option.none();
};

const isImportColumn = (name: string): name is ImportColumn =>
  importColumns.some((column) => column === name);

const requiredColumns: readonly ImportColumn[] = ["text", "channels", "at"];

const unreadable = (
  problem: ImportUnreadable["problem"],
  column: string | null = null
) => Effect.fail(new ImportUnreadable({ column, problem }));

// The columns a file's first line names, in its order.
const columnsOf = (header: readonly string[]) =>
  Effect.gen(function* readingHeader() {
    const names = header.map((name) => name.trim());
    const unknown = names.find((name) => !isImportColumn(name));

    if (unknown !== undefined) {
      return yield* unreadable("unknownColumn", unknown);
    }

    const repeated = names.find((name, index) => names.indexOf(name) < index);

    if (repeated !== undefined) {
      return yield* unreadable("repeatedColumn", repeated);
    }

    const missing = requiredColumns.find((column) => !names.includes(column));

    if (missing !== undefined) {
      return yield* unreadable("missingColumn", missing);
    }

    return names.filter(isImportColumn);
  });

// A file's rows, each as its cells by column.
const importRows = (csv: string) =>
  Effect.gen(function* readingRows() {
    const read = csvRows(csv);

    if (Option.isNone(read)) {
      return yield* unreadable("unterminatedQuote");
    }

    const [header, ...rows] = read.value;

    if (header === undefined) {
      return yield* unreadable("empty");
    }

    const names = yield* columnsOf(header);

    if (rows.length > maxImportRows) {
      return yield* unreadable("tooManyRows");
    }

    return rows.map(
      (cells) =>
        new Map(names.map((name, index) => [name, (cells[index] ?? "").trim()]))
    );
  });

const instantWithOffset =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/u;

const localTime = /^(?<day>\d{4}-\d{2}-\d{2})[ T](?<time>\d{2}:\d{2})$/u;

// The time a row's `at` names: now, an instant, or a local time read in
// the row's zone (UTC when the zone is no zone: its check says so).
const whenOf = (
  written: string,
  timeZone: string
): Option.Option<NewPost["when"]> => {
  if (written === "now") {
    return Option.some({ _tag: "now", timeZone });
  }

  if (instantWithOffset.test(written)) {
    return DateTime.make(written).pipe(
      Option.map((instant) => ({
        _tag: "at" as const,
        at: DateTime.toUtc(instant),
        timeZone,
      }))
    );
  }

  const local = localTime.exec(written)?.groups;

  if (local === undefined) {
    return Option.none();
  }

  const wallClock = `${local["day"] ?? ""}T${local["time"] ?? ""}:00Z`;

  return DateTime.makeZoned(wallClock, {
    adjustForTimeZone: true,
    timeZone,
  }).pipe(
    Option.orElse(() => DateTime.make(wallClock)),
    Option.map((instant) => ({
      _tag: "at" as const,
      at: DateTime.toUtc(instant),
      timeZone,
    }))
  );
};

const idsIn = (cell: string): string[] =>
  cell.split(/[\s,;]+/u).filter((id) => id !== "");

const problem = (
  column: ImportColumn,
  kind: ImportCellProblem["problem"]
): ImportCellProblem => ({ column, problem: kind });

/** A row of an import, read: its post and key, or the cells at fault. */
type ImportedRow =
  | { readonly _tag: "unreadable"; readonly problems: ImportCellProblem[] }
  | {
      readonly _tag: "read";
      readonly key: string | undefined;
      readonly post: NewPost;
    };

// A row's post, or the cells that cannot be read, in the columns' order.
// What its channels cell lists is a channel's id, or one of the
// workspace's channel sets, by id or by name.
const rowOf = (
  cells: ReadonlyMap<ImportColumn, string>,
  sets: readonly StudioSet[]
): ImportedRow => {
  const cell = (column: ImportColumn) => cells.get(column) ?? "";
  const channelIds = idsIn(cell("channels"));

  const named = channelIds.filter(
    (entry) => setNamed(sets, entry) !== undefined
  );

  const fromSets = named.length === 0 ? {} : { channelSets: named };

  const media = idsIn(cell("media"));
  const when = whenOf(cell("at"), cell("time_zone") || "UTC");
  const duplicate = cell("allow_duplicate");
  const [first, ...others] = channelIds;

  const problems = [
    cell("text") === "" && media.length === 0
      ? [problem("text", "missing")]
      : [],
    first === undefined ? [problem("channels", "missing")] : [],
    cell("at") === "" ? [problem("at", "missing")] : [],
    cell("at") !== "" && Option.isNone(when) ? [problem("at", "invalid")] : [],
    ["", "true", "false"].includes(duplicate)
      ? []
      : [problem("allow_duplicate", "invalid")],
  ].flat();

  if (problems.length > 0 || first === undefined || Option.isNone(when)) {
    return { _tag: "unreadable", problems };
  }

  return {
    _tag: "read",
    key: cell("idempotency_key") || undefined,
    post: {
      allowDuplicate: duplicate === "true",
      channelIds: [first, ...others].filter((entry) => !named.includes(entry)),
      ...fromSets,
      content: {
        media: media.map((mediaId) => ({ altText: "", mediaId })),
        overrides: [],
        text: cell("text"),
      },
      when: when.value,
    },
  };
};

// The key a row is kept under: its own, or the request's with its place.
const keyOf = (
  read: { readonly key: string | undefined },
  row: number,
  key: string | undefined
) => read.key ?? (key === undefined ? undefined : `${key}:${String(row)}`);

// A row as the import's first pass finds it: checked, and not made. One
// made before under its key is valid: it is answered again.
const checkedRow = (
  studio: Studio,
  read: ImportedRow,
  row: number,
  key: string | undefined
): Effect.Effect<ImportRowResult> =>
  read._tag === "unreadable"
    ? Effect.succeed({ _tag: "unreadable", problems: read.problems, row })
    : madeUnder(studio, read.post, keyOf(read, row, key)).pipe(
        Effect.flatMap((first) =>
          Option.isSome(first) ? Effect.void : checkNewPost(studio, read.post)
        ),
        Effect.match({
          onFailure: (refusal): ImportRowResult => ({
            _tag: "refused",
            refusal,
            row,
          }),
          onSuccess: (): ImportRowResult => ({ _tag: "valid", row }),
        })
      );

// A row as the import's second pass makes it, under its own key or the
// request's, by its place.
const madeRow = (
  studio: Studio,
  read: ImportedRow,
  row: number,
  key: string | undefined
): Effect.Effect<ImportRowResult> =>
  read._tag === "unreadable"
    ? Effect.succeed({ _tag: "unreadable", problems: read.problems, row })
    : makePost(studio, read.post, keyOf(read, row, key)).pipe(
        Effect.match({
          onFailure: (refusal): ImportRowResult => ({
            _tag: "refused",
            refusal,
            row,
          }),
          onSuccess: ({ post, replayed, warnings }): ImportRowResult => ({
            _tag: "created",
            post: told(post, warnings),
            replayed,
            row,
          }),
        })
      );

/** The workspace groups and the account's, answered from the studio. */
// A short link a post went out with, and the server's short links.
const shortLinkStatusFixture = {
  available: true,
  base: "https://go.example.test/",
  byDefault: false,
  shortLength: 31,
};

const shortLinkFixture = {
  channelId: "0190f3a0-0000-7000-8000-0000000000c1",
  clicks: 12,
  createdAt: at("2026-11-01T09:00:00Z"),
  destination: "https://example.test/spring-catalogue",
  disabled: false,
  id: "0190f3a0-0000-7000-8000-0000000005a1",
  part: 0,
  postId: "0190f3a0-0000-7000-8000-0000000005b1",
  shortUrl: "https://go.example.test/AbC1234",
  targetId: "0190f3a0-0000-7000-8000-0000000005c1",
};

// An hour of the studio's best times.
const studioHour = (
  weekday: "friday" | "tuesday",
  hour: number,
  median: number | null,
  count: number
) => ({ hour, median, posts: count, weekday });

export const studioGroupsLive = (studio: Studio) =>
  Layer.mergeAll(
    adsGroupLive(studio),
    queuesOfStudio.groupLive(studio),
    recyclingOfStudio.groupLive(studio),
    feedsOfStudio.groupLive(studio),
    overviewGroupLive(studio, studioId),
    HttpApiBuilder.group(Api, "session", (handlers) =>
      handlers.handleAll({
        me: () => inPerson.pipe(Effect.as(studio.me)),
      })
    ),
    // A key names itself and its workspace; a person, their id and the
    // command line's grant.
    HttpApiBuilder.group(Api, "credential", (handlers) =>
      handlers.handleAll({
        get: () =>
          CurrentPrincipal.pipe(
            Effect.map((principal): Credential => {
              if (principal._tag !== "apiKey") {
                return {
                  _tag: "user",
                  application: null,
                  impersonatedBy: null,
                  userId: studio.me.user.id,
                };
              }

              const key = studio.keys.find(
                ({ id }) => id === principal.apiKeyId
              );

              return {
                _tag: "apiKey",
                expiresAt: null,
                id: principal.apiKeyId,
                name: "Synthetic script",
                permissions: principal.permissions,
                start: key?.key.slice(0, 10) ?? null,
                workspace: { id: principal.workspaceId, name: "Studio" },
              };
            })
          ),
      })
    ),
    HttpApiBuilder.group(Api, "channels", (handlers) =>
      handlers.handleAll({
        chooseAccounts: () => refusing,
        completeConnect: () => refusing,
        connect: () => refusing,
        disable: ({ params }) =>
          changingChannel(studio, params, turnedOff, "disable"),
        disconnect: () => refusing,
        enable: ({ params }) =>
          changingChannel(studio, params, turnedOn, "enable"),
        find: ({ params, query }) =>
          Effect.gen(function* find() {
            yield* allowed("channel:read");

            // The platform and the text narrow the counts; the status
            // narrows the list alone.
            const matching = (yield* channelsNow(
              studio,
              params.workspaceId
            )).filter(
              (channel) =>
                (query.platform === undefined ||
                  channel.platform === query.platform) &&
                (query.q === undefined || holds(channel, query.q))
            );

            const listed = matching.filter(
              ({ status }) =>
                query.status === undefined || status._tag === query.status
            );

            // A cursor is the id of the last channel of the page before.
            const start =
              query.cursor === undefined
                ? 0
                : listed.findIndex(({ id }) => id === query.cursor) + 1;

            if (query.cursor !== undefined && start === 0) {
              return yield* new HttpApiError.BadRequest();
            }

            const items = listed.slice(start, start + (query.limit ?? 50));
            const last = items.at(-1);

            return {
              counts: countsOf(matching),
              items,
              nextCursor:
                last !== undefined && start + items.length < listed.length
                  ? last.id
                  : null,
            };
          }),
        list: ({ params }) =>
          allowed("channel:read").pipe(
            Effect.andThen(channelsNow(studio, params.workspaceId))
          ),
        platforms: () => refusing,
        reconnect: () => refusing,
        update: ({ params, payload }) =>
          changingChannel(
            studio,
            params,
            (channel) =>
              channel.label === payload.label
                ? channel
                : { ...channel, label: payload.label },
            "rename"
          ),
      })
    ),
    HttpApiBuilder.group(Api, "posts", (handlers) =>
      handlers.handleAll({
        attempts: ({ params }) =>
          allowed("post:read").pipe(
            Effect.andThen(findPost(studio, params.workspaceId, params.postId)),
            Effect.map(({ id }) => (id === finishedId ? attempts : []))
          ),
        bulk: ({ headers, params, payload }) =>
          Effect.gen(function* bulk() {
            yield* publishing;

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            const key = headers["idempotency-key"];

            // One at a time, in order: each is checked against those made
            // before it.
            const items = yield* Effect.all(
              payload.posts.map(({ idempotencyKey, ...written }, index) =>
                makePost(
                  studio,
                  written,
                  idempotencyKey ??
                    (key === undefined ? undefined : `${key}:${String(index)}`)
                ).pipe(
                  Effect.match({
                    onFailure: (refusal) => ({
                      _tag: "refused" as const,
                      index,
                      refusal,
                    }),
                    onSuccess: (made) => ({
                      _tag: "created" as const,
                      index,
                      ...made,
                    }),
                  })
                )
              )
            );

            const created = items.filter(
              ({ _tag }) => _tag === "created"
            ).length;

            return { created, items, refused: items.length - created };
          }),
        cancel: ({ params }) =>
          Effect.gen(function* cancel() {
            yield* publishing;

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            if (post.status === "finished" || post.status === "cancelled") {
              return yield* new PostStatusConflict({ status: post.status });
            }

            yield* record(studio, `cancel:${post.id}`);

            return yield* savePost(
              studio,
              post.status === "publishing"
                ? post
                : { ...post, outcome: "cancelled", status: "cancelled" }
            );
          }),
        changes: ({ params }) =>
          allowed("post:read").pipe(
            Effect.andThen(findPost(studio, params.workspaceId, params.postId)),
            Effect.map((post) => ({
              items: post.targets.flatMap((target) =>
                target.removedAt === null ? [] : [doneChange(post.id, target)]
              ),
            }))
          ),
        confirm: ({ params, payload }) =>
          publishing.pipe(
            Effect.andThen(
              changingTarget(studio, params, (target) =>
                target.status === "unconfirmed"
                  ? Option.some(
                      payload._tag === "published"
                        ? {
                            ...target,
                            permalink: payload.permalink,
                            status: "published",
                            unconfirmedReason: null,
                          }
                        : {
                            ...target,
                            failureReason: "notPublished",
                            status: "failed",
                            unconfirmedReason: null,
                          }
                    )
                  : Option.none()
              )
            ),
            Effect.tap(() =>
              record(studio, `confirm:${params.targetId}:${payload._tag}`)
            )
          ),
        create: ({ params, payload }) =>
          Effect.gen(function* create() {
            yield* allowed("post:create");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            yield* checkTags(studio, payload.tagIds ?? []);

            const { post: written, warnings } = yield* filled(
              studio,
              payload,
              true
            );

            const { posts: all, shortLinksByDefault } = yield* Ref.get(
              studio.state
            );

            const id = `0190f3a0-0000-7000-8000-${String(all.length + 1).padStart(12, "0")}`;

            yield* record(studio, `create:${id}`);

            const saved = yield* savePost(studio, {
              authorId: userId,
              content: written.content,
              createdVia: null,
              id,
              occurrence: null,
              outcome: null,
              queueId: null,
              recyclingId: null,
              schedule: null,
              scheduledBy: null,
              scheduledVia: null,
              shortenLinks: payload.shortenLinks ?? shortLinksByDefault,
              status: "draft",
              tagIds: payload.tagIds ?? [],
              targets: targetsOf(id, written),
            });

            return told(saved, warnings);
          }),
        discard: ({ params }) =>
          Effect.gen(function* discard() {
            yield* allowed("post:delete");

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            yield* post.status === "draft"
              ? Effect.void
              : Effect.fail(new PostStatusConflict({ status: post.status }));

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              posts: current.posts.filter(({ id }) => id !== post.id),
            }));
            yield* record(studio, `discard:${post.id}`);
          }),
        drafts: ({ params, query }) =>
          Effect.gen(function* drafts() {
            yield* allowed("post:read");

            const { posts: all } = yield* Ref.get(studio.state);

            const listed =
              params.workspaceId === studioId
                ? all.filter(({ status }) => status === "draft")
                : [];

            const start =
              query.cursor === undefined
                ? 0
                : listed.findIndex(({ id }) => id === query.cursor) + 1;

            const limit = query.limit ?? 20;
            const items = listed.slice(start, start + limit);
            const last = items.at(-1);

            return {
              items,
              nextCursor:
                last !== undefined && start + limit < listed.length
                  ? last.id
                  : null,
            };
          }),
        duplicate: ({ params }) =>
          Effect.gen(function* duplicate() {
            yield* allowed("post:read");
            yield* allowed("post:create");
            yield* allowed("channel:read");

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            const current = yield* Ref.get(studio.state);
            const id = `0190f3a0-0000-7000-8000-${String(current.posts.length + 1).padStart(12, "0")}`;

            // What the workspace no longer has is left out.
            const kept = post.targets.filter(({ channelId }) =>
              current.channels.some((channel) => channel.id === channelId)
            );

            yield* record(studio, `duplicate:${post.id}:${id}`);

            return yield* savePost(studio, {
              authorId: userId,
              content: {
                media: post.content.media.filter(({ mediaId }) =>
                  current.media.some((media) => media.id === mediaId)
                ),
                overrides: post.content.overrides.filter(({ channelId }) =>
                  kept.some((target) => target.channelId === channelId)
                ),
                text: post.content.text,
              },
              createdVia: null,
              id,
              occurrence: null,
              outcome: null,
              queueId: null,
              recyclingId: null,
              schedule: null,
              scheduledBy: null,
              scheduledVia: null,
              shortenLinks: post.shortenLinks,
              status: "draft",
              tagIds: post.tagIds.filter((tagId) =>
                current.tags.some((tag) => tag.id === tagId)
              ),
              targets: kept.map((target, index) => ({
                ...pendingOn(`${id}-${String(index)}`, target.channelId),
                options: target.options,
              })),
            });
          }),
        editTarget: ({ params, payload }) =>
          Effect.gen(function* editTarget() {
            yield* unpublishing;

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            const target = post.targets.find(
              ({ id }) => id === params.targetId
            );

            if (target === undefined) {
              return yield* new PostNotFound();
            }

            const { channels: known } = yield* Ref.get(studio.state);

            const platform = known.find(
              ({ id }) => id === target.channelId
            )?.platform;

            const part = payload.part ?? 0;

            const refusal = editRefusal(target, platform, part);

            if (refusal !== undefined) {
              return yield* new LivePostNotChangeable({ reason: refusal });
            }

            yield* savePost(studio, {
              ...withTextOn(post, part, target.channelId, payload.text),
              targets: post.targets.map((found) =>
                found.id === target.id
                  ? { ...found, editedAt: studioNow }
                  : found
              ),
            });
            yield* record(studio, `edit:${target.id}:${String(part)}`);

            return { ...doneChange(post.id, target), kind: "edit" as const };
          }),
        enqueue: ({ params, payload }) =>
          Effect.gen(function* enqueue() {
            yield* publishing;

            const queue = yield* queuesOfStudio.queueFor(
              studio,
              params.workspaceId,
              payload.queueId
            );

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            if (
              post.status !== "draft" &&
              post.status !== "scheduled" &&
              post.status !== "awaitingApproval"
            ) {
              return yield* new PostStatusConflict({ status: post.status });
            }

            // The post's own slot is free for it.
            const slot = yield* queuesOfStudio.nextFreeOf(
              studio,
              queue,
              post.id
            );

            if (Option.isNone(slot)) {
              return yield* new QueueHasNoRoom({
                queueId: queue.id,
                reason: queue.slots.length === 0 ? "noSlots" : "full",
              });
            }

            const own = post.targets.map(({ channelId }) => channelId);

            const channelIds =
              post.status === "draft"
                ? (payload.channelIds ??
                  (own.length > 0 ? own : queue.channelIds))
                : own;

            yield* checkChannels(channelIds);

            const status = yield* checkTime(slot.value, queue.timeZone);
            const options = optionsOn(post);

            yield* checkContent(channelIds, post.content, options);
            yield* record(
              studio,
              `enqueue:${post.id}:${queue.id}:${DateTime.formatIso(slot.value)}`
            );

            return yield* savePost(studio, {
              ...post,
              queueId: queue.id,
              schedule: { at: slot.value, timeZone: queue.timeZone },
              scheduledBy: userId,
              scheduledVia: viaCommandLine,
              status,
              targets: targetsOf(post.id, {
                channelIds,
                content: post.content,
                options,
              }),
            });
          }),
        get: ({ params }) =>
          allowed("post:read").pipe(
            Effect.andThen(findPost(studio, params.workspaceId, params.postId))
          ),
        import: ({ headers, params, payload }) =>
          Effect.gen(function* importing() {
            yield* publishing;

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            const { channelSets: sets } = yield* Ref.get(studio.state);

            const read = (yield* importRows(payload.csv)).map((cells) =>
              rowOf(cells, sets)
            );

            const key = headers["idempotency-key"];

            // Every row is checked first: nothing is made unless all of
            // them are valid.
            const checked = yield* Effect.all(
              read.map((row, index) => checkedRow(studio, row, index + 1, key))
            );

            const dryRun = payload.dryRun === true;

            if (dryRun || checked.some(({ _tag }) => _tag !== "valid")) {
              return { created: 0, dryRun, rows: checked };
            }

            const rows = yield* Effect.all(
              read.map((row, index) => madeRow(studio, row, index + 1, key))
            );

            return {
              created: rows.filter(({ _tag }) => _tag === "created").length,
              dryRun,
              rows,
            };
          }),
        list: ({ params, query }) =>
          Effect.gen(function* list() {
            yield* allowed("post:read");

            if (DateTime.isLessThan(query.to, query.from)) {
              return yield* new InvalidTimeRange();
            }

            const { posts: all } = yield* Ref.get(studio.state);

            return params.workspaceId === studioId
              ? all.filter(
                  ({ schedule }) =>
                    schedule !== null &&
                    DateTime.isGreaterThanOrEqualTo(schedule.at, query.from) &&
                    DateTime.isLessThan(schedule.at, query.to)
                )
              : [];
          }),
        outcome: ({ params, query }) =>
          allowed("post:read").pipe(
            Effect.andThen(findPost(studio, params.workspaceId, params.postId)),
            Effect.flatMap((post) => afterWaiting(studio, post, query.wait))
          ),
        removeTarget: ({ params }) =>
          Effect.gen(function* removeTarget() {
            yield* publishing;

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            if (
              post.status !== "scheduled" &&
              post.status !== "awaitingApproval"
            ) {
              return yield* new PostStatusConflict({ status: post.status });
            }

            const others = post.targets.filter(
              ({ id, status }) => id !== params.targetId && status === "pending"
            );

            if (
              others.length === 0 &&
              post.targets.some(
                ({ id, status }) =>
                  id === params.targetId && status === "pending"
              )
            ) {
              return yield* new LastTargetLeft();
            }

            const already = post.targets.find(
              ({ dropped, id }) => id === params.targetId && dropped === true
            );

            if (already !== undefined) {
              return post;
            }

            const removed = yield* changingTarget(studio, params, (target) =>
              target.status === "pending"
                ? Option.some({
                    ...target,
                    dropped: true,
                    status: "cancelled" as const,
                  })
                : Option.none()
            );

            yield* record(studio, `remove-target:${params.targetId}`);

            return removed;
          }),
        repost: ({ params }) =>
          publishing.pipe(
            Effect.andThen(
              changingTarget(studio, params, (target) =>
                target.status === "failed" || target.status === "unconfirmed"
                  ? Option.some({
                      ...target,
                      failureReason: null,
                      round: target.round + 1,
                      status: "pending",
                      unconfirmedReason: null,
                    })
                  : Option.none()
              )
            ),
            Effect.tap(() => record(studio, `repost:${params.targetId}`))
          ),
        reschedule: ({ params, payload }) =>
          Effect.gen(function* reschedule() {
            yield* publishing;

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            if (post.status !== "draft" && post.status !== "scheduled") {
              return yield* new PostStatusConflict({ status: post.status });
            }

            const status = yield* checkTime(payload.at, payload.timeZone);

            yield* checkContent(
              post.targets.map(({ channelId }) => channelId),
              post.content,
              optionsOn(post)
            );
            yield* record(
              studio,
              `reschedule:${post.id}:${DateTime.formatIso(payload.at)}:${payload.timeZone}`
            );

            return yield* savePost(studio, {
              ...post,
              schedule: payload,
              scheduledBy: userId,
              scheduledVia: viaCommandLine,
              status,
            });
          }),
        schedule: ({ params, payload }) =>
          Effect.gen(function* schedule() {
            yield* publishing;

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            if (post.status !== "draft") {
              return yield* new PostStatusConflict({ status: post.status });
            }

            yield* checkChannels(payload.channelIds);

            const status = yield* checkTime(payload.at, payload.timeZone);
            const options = optionsOn(post);

            yield* checkContent(payload.channelIds, post.content, options);
            yield* record(
              studio,
              `schedule:${post.id}:${DateTime.formatIso(payload.at)}:${payload.timeZone}:${payload.channelIds.join("+")}`
            );

            return yield* savePost(studio, {
              ...post,
              schedule: { at: payload.at, timeZone: payload.timeZone },
              scheduledBy: userId,
              scheduledVia: viaCommandLine,
              status,
              targets: targetsOf(post.id, {
                channelIds: payload.channelIds,
                content: post.content,
                options,
              }),
            });
          }),
        search: ({ params, query }) =>
          Effect.gen(function* search() {
            yield* allowed("post:read");
            yield* allowed("channel:read");

            if (
              query.from !== undefined &&
              query.to !== undefined &&
              DateTime.toEpochMillis(query.to) <
                DateTime.toEpochMillis(query.from)
            ) {
              return yield* new InvalidTimeRange();
            }

            const { posts: all } = yield* Ref.get(studio.state);

            const matching = sorted(
              params.workspaceId === studioId ? all : [],
              query.sort ?? "createdDesc"
            ).filter((post) =>
              [
                query.status === undefined || post.status === query.status,
                query.outcome === undefined || post.outcome === query.outcome,
                query.channelId === undefined ||
                  post.targets.some(
                    ({ channelId }) => channelId === query.channelId
                  ),
                query.platform === undefined ||
                  isOnPlatform(post, query.platform),
                isWithin(post, query.from, query.to),
                query.createdVia === undefined ||
                  post.createdVia?.via === query.createdVia,
                query.authorId === undefined ||
                  post.authorId === query.authorId,
                query.tagId === undefined || post.tagIds.includes(query.tagId),
              ].every(Boolean)
            );

            const listed = yield* pageFrom(matching, query.cursor);
            const limit = query.limit ?? 20;
            const items = listed.slice(0, limit);
            const last = items.at(-1);

            return {
              // The channels the page names that are still connected.
              channels: channels.flatMap(({ id, platform }) =>
                items.some(({ targets }) =>
                  targets.some(({ channelId }) => channelId === id)
                )
                  ? [{ channelId: id, platform }]
                  : []
              ),
              items,
              nextCursor:
                last !== undefined && limit < listed.length ? last.id : null,
            };
          }),
        send: ({ headers, params, payload, query }) =>
          Effect.gen(function* send() {
            yield* publishing;

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            const { post, warnings } = yield* makePost(
              studio,
              payload,
              headers["idempotency-key"]
            );

            return told(
              yield* afterWaiting(studio, post, query.wait),
              warnings
            );
          }),
        tag: ({ params, payload }) =>
          Effect.gen(function* tag() {
            yield* allowed("post:update");

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            yield* checkTags(studio, payload.tagIds);
            yield* record(studio, `tag:${post.id}:${payload.tagIds.join(",")}`);

            return yield* savePost(studio, {
              ...post,
              tagIds: payload.tagIds,
            });
          }),
        unpublish: ({ params }) =>
          Effect.gen(function* unpublish() {
            yield* unpublishing;

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            const changes: LivePostChange[] = [];
            const refused: { reason: LivePostRefusal; targetId: string }[] = [];

            const targets = post.targets.map((target) => {
              const made = unpublishedOn(target);

              if (Result.isFailure(made)) {
                refused.push({ reason: made.failure, targetId: target.id });

                return target;
              }

              changes.push(doneChange(post.id, target));

              return made.success;
            });

            yield* savePost(studio, { ...post, targets });
            yield* record(studio, `unpublish:${post.id}`);

            return { changes, refused };
          }),
        unpublishTarget: ({ params }) =>
          Effect.gen(function* unpublishTarget() {
            yield* unpublishing;

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            const target = post.targets.find(
              ({ id }) => id === params.targetId
            );

            if (target === undefined) {
              return yield* new PostNotFound();
            }

            const made = unpublishedOn(target);

            if (Result.isFailure(made)) {
              return yield* new LivePostNotChangeable({ reason: made.failure });
            }

            yield* savePost(studio, {
              ...post,
              targets: post.targets.map((found) =>
                found.id === target.id ? made.success : found
              ),
            });
            yield* record(studio, `unpublish:${target.id}`);

            return doneChange(post.id, target);
          }),
        unschedule: ({ params }) =>
          Effect.gen(function* unschedule() {
            yield* publishing;

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            if (post.status !== "scheduled") {
              return yield* new PostStatusConflict({ status: post.status });
            }

            yield* record(studio, `unschedule:${post.id}`);

            return yield* savePost(studio, {
              ...post,
              schedule: null,
              status: "draft",
            });
          }),
        update: ({ params, payload }) =>
          Effect.gen(function* update() {
            yield* allowed("post:update");

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            if (post.status !== "draft") {
              return yield* new PostStatusConflict({ status: post.status });
            }

            yield* checkTags(studio, payload.tagIds ?? []);

            // A draft that changes keeps what it is given: no defaults.
            const { post: written, warnings } = yield* filled(
              studio,
              payload,
              false
            );

            yield* record(studio, `update:${post.id}`);

            const saved = yield* savePost(studio, {
              ...post,
              content: written.content,
              // Tags left out are kept.
              tagIds: payload.tagIds ?? post.tagIds,
              targets: targetsOf(post.id, written),
            });

            return told(saved, warnings);
          }),
        validate: ({ params, payload: asked }) =>
          Effect.gen(function* validate() {
            yield* allowed("post:read");
            yield* allowed("channel:read");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            // Added to a queue, it is checked at the slot it would take.
            const onQueue =
              asked.when?._tag === "queue"
                ? yield* queuesOfStudio
                    .queueFor(studio, studioId, asked.when.queueId)
                    .pipe(
                      Effect.flatMap((queue) =>
                        queuesOfStudio
                          .nextFreeOf(studio, queue)
                          .pipe(Effect.map((slot) => ({ queue, slot })))
                      )
                    )
                : undefined;

            const { when: _asked, ...timeless } = asked;

            const onSlot: typeof asked =
              onQueue === undefined
                ? asked
                : Option.match(onQueue.slot, {
                    onNone: () => timeless,
                    onSome: (slotAt) => ({
                      ...timeless,
                      channelIds:
                        asked.channelIds.length === 0 &&
                        (asked.channelSets ?? []).length === 0
                          ? onQueue.queue.channelIds
                          : asked.channelIds,
                      when: {
                        _tag: "at" as const,
                        at: slotAt,
                        timeZone: onQueue.queue.timeZone,
                      },
                    }),
                  });

            const queueAnswer =
              onQueue === undefined
                ? {}
                : Option.match(onQueue.slot, {
                    onNone: () => ({
                      queueNoRoom:
                        onQueue.queue.slots.length === 0
                          ? ("noSlots" as const)
                          : ("full" as const),
                    }),
                    onSome: (queueSlot) => ({ queueSlot }),
                  });

            const { post: payload, warnings } = yield* filled(
              studio,
              onSlot,
              true
            );

            const { when } = payload;
            const { policy, posts: all } = yield* Ref.get(studio.state);

            const warned = warnings.length === 0 ? {} : { warnings };

            const validation: Omit<PostValidation, "valid" | "warnings"> = {
              // Where every post waits, this one would.
              awaitsApproval: when !== undefined && policy === "always",
              channels: payload.channelIds.flatMap((channelId) => {
                const channel = channels.find(({ id }) => id === channelId);

                return channel === undefined
                  ? []
                  : [
                      previewOn(
                        channel,
                        payload.content,
                        payload.options ?? []
                      ),
                    ];
              }),
              // Without a time, nothing is near it.
              duplicates:
                when === undefined
                  ? []
                  : duplicatesOf(all, payload, timeOf({ when }).at),
              planLimit: null,
              schedule:
                when === undefined ? null : yield* scheduleCheck({ when }),
              unknownChannels: payload.channelIds.filter(
                (channelId) => !channels.some(({ id }) => id === channelId)
              ),
              unknownMedia: yield* unknownMediaOf(studio, payload.content),
              violations:
                payload.channelIds.length === 0 ? [{ _tag: "noChannels" }] : [],
            };

            return {
              ...validation,
              valid:
                validation.channels.every(
                  ({ violations }) => violations.length === 0
                ) &&
                validation.duplicates.length === 0 &&
                (validation.schedule ?? "ok") === "ok" &&
                validation.unknownChannels.length === 0 &&
                validation.unknownMedia.length === 0 &&
                validation.violations.length === 0 &&
                !("queueNoRoom" in queueAnswer),
              ...queueAnswer,
              ...warned,
            };
          }),
      })
    ),
    // The assistant makes images only: the command line writes no text
    // with it. A prompt that says "unavailable" stands for a server without
    // an image model.
    HttpApiBuilder.group(Api, "assistant", (handlers) =>
      handlers.handleAll({
        generateImage: ({ params, payload }) =>
          Effect.gen(function* generateImage() {
            yield* allowed("assistant:use");
            yield* allowed("media:upload");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            if (payload.prompt.includes("unavailable")) {
              return yield* new AssistantUnavailable();
            }

            // A plan whose day holds fewer requests than an image costs.
            if (payload.prompt.includes("quota")) {
              return yield* new AssistantQuotaExceeded({
                billingUrl: null,
                dailyLimit: 3,
                plan: "free",
                planWithRoom: "starter",
                resetsAt: studioNow,
              });
            }

            const { media: all } = yield* Ref.get(studio.state);
            const id = nextId("a", all.length);

            yield* record(studio, `generate:${payload.aspect}:${id}`);

            return yield* saveMedia(
              studio,
              image(id, {
                aiGenerated: true,
                createdAt: studioNow,
                updatedAt: studioNow,
              })
            );
          }),
        // The studio's own image provider. An address on a host named
        // `internal` stands for one that is not public.
        imageProvider: ({ params }) =>
          Effect.gen(function* imageProvider() {
            yield* allowed("assistant:configure");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            const { imageProvider: brought } = yield* Ref.get(studio.state);

            return { provider: brought?.provider ?? null };
          }),
        removeImageProvider: ({ params }) =>
          Effect.gen(function* removeImageProvider() {
            yield* allowed("assistant:configure");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              imageProvider: null,
            }));

            return yield* record(studio, "image-provider:remove");
          }),
        setImageProvider: ({ params, payload }) =>
          Effect.gen(function* setImageProvider() {
            yield* allowed("assistant:configure");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            const url = URL.parse(payload.baseUrl);

            if (url === null || url.protocol !== "https:") {
              return yield* new ImageProviderAddressRefused({
                reason: url === null ? "malformed" : "notHttps",
              });
            }

            if (url.hostname.includes("internal")) {
              return yield* new ImageProviderAddressRefused({
                reason: "notPublic",
              });
            }

            const { imageProvider: brought } = yield* Ref.get(studio.state);

            const address = url.href.replace(/\/+$/u, "");

            const kept =
              brought !== null && brought.provider.baseUrl === address
                ? brought.apiKey
                : null;

            const apiKey = payload.apiKey ?? kept;

            if (apiKey === null) {
              return yield* new ImageProviderKeyRequired();
            }

            const provider: ImageProvider = {
              baseUrl: address,
              keySet: true,
              keyUnreadable: false,
              model: payload.model,
              updatedAt: studioNow,
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              imageProvider: { apiKey, provider },
            }));
            yield* record(studio, `image-provider:set:${address}`);

            return provider;
          }),
        status: () => Effect.fail(new Forbidden()),
        suggest: () => Effect.fail(new Forbidden()),
        // The studio's own text provider, kept as the image provider is. A
        // key with "refused" in it stands for one the provider refuses.
        removeTextProvider: ({ params }) =>
          Effect.gen(function* removeTextProvider() {
            yield* allowed("assistant:configure");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              textProvider: null,
            }));

            return yield* record(studio, "text-provider:remove");
          }),
        setTextProvider: ({ params, payload }) =>
          Effect.gen(function* setTextProvider() {
            yield* allowed("assistant:configure");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            const url = URL.parse(payload.baseUrl);

            if (url === null || url.protocol !== "https:") {
              return yield* new TextProviderAddressRefused({
                reason: url === null ? "malformed" : "notHttps",
              });
            }

            if (url.hostname.includes("internal")) {
              return yield* new TextProviderAddressRefused({
                reason: "notPublic",
              });
            }

            const { textProvider: brought } = yield* Ref.get(studio.state);
            const address = url.href.replace(/\/+$/u, "");

            const kept =
              brought !== null && brought.provider.baseUrl === address
                ? brought.apiKey
                : null;

            const apiKey = payload.apiKey ?? kept;

            if (apiKey === null) {
              return yield* new TextProviderKeyRequired();
            }

            const provider: TextProvider = {
              baseUrl: address,
              keySet: true,
              keyUnreadable: false,
              kind: payload.kind,
              model: payload.model,
              updatedAt: studioNow,
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              textProvider: { apiKey, provider },
            }));
            yield* record(
              studio,
              `text-provider:set:${payload.kind}:${address}`
            );

            return provider;
          }),
        testTextProvider: ({ params }) =>
          Effect.gen(function* testTextProvider() {
            yield* allowed("assistant:configure");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            const { textProvider: brought } = yield* Ref.get(studio.state);

            if (brought === null) {
              return yield* new TextProviderNotFound();
            }

            if (brought.apiKey.includes("refused")) {
              return yield* new TextProviderRefused({
                reason: "settingsRefused",
                status: 401,
              });
            }

            return yield* record(studio, "text-provider:test");
          }),
        textProvider: ({ params }) =>
          Effect.gen(function* textProvider() {
            yield* allowed("assistant:configure");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            const { textProvider: brought } = yield* Ref.get(studio.state);

            return { provider: brought?.provider ?? null };
          }),
      })
    ),
    HttpApiBuilder.group(Api, "media", (handlers) =>
      handlers.handleAll({
        complete: ({ params }) =>
          Effect.gen(function* complete() {
            yield* allowed("media:upload");

            const pending = yield* findMedia(studio, params.mediaId);
            const { stored } = yield* Ref.get(studio.state);

            const arrived = stored
              .filter(({ mediaId }) => mediaId === pending.id)
              .reduce((sum, { byteSize }) => sum + byteSize, 0);

            if (arrived !== pending.byteSize) {
              return yield* new UploadIncomplete();
            }

            yield* record(studio, `complete:${pending.id}`);

            return yield* saveMedia(studio, {
              ...pending,
              status: { _tag: "ready" },
              url: `https://${storeHost}/read/${pending.id}`,
            });
          }),
        create: ({ params, payload }) =>
          Effect.gen(function* create() {
            yield* allowed("media:upload");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            const { byteSize, contentType } = payload;

            if (!isStoredType(contentType)) {
              return yield* new UnsupportedMediaType({ contentType });
            }

            const kind = contentType.startsWith("image/") ? "image" : "video";

            if (kind === "image" && byteSize > maxImageBytes) {
              return yield* new MediaTooLarge({
                byteSize,
                kind,
                maxByteSize: maxImageBytes,
              });
            }

            const { media: all } = yield* Ref.get(studio.state);
            const id = nextId("f", all.length);
            const expiresAt = at("2026-11-09T13:00:00Z");

            yield* record(studio, `upload:${id}:${contentType}`);

            const pending = yield* saveMedia(
              studio,
              image(id, {
                altText: payload.altText ?? null,
                byteSize,
                contentType,
                createdAt: studioNow,
                dimensions: null,
                kind,
                status: { _tag: "pending" },
                updatedAt: studioNow,
                url: null,
              })
            );

            return {
              media: pending,
              upload:
                kind === "image"
                  ? {
                      _tag: "single" as const,
                      expiresAt,
                      request: signed(
                        id,
                        {
                          "content-length": String(byteSize),
                          "content-type": contentType,
                          "if-none-match": "*",
                        },
                        null
                      ),
                    }
                  : {
                      _tag: "multipart" as const,
                      expiresAt,
                      partSize,
                      parts: Array.from(
                        { length: Math.ceil(byteSize / partSize) },
                        (_, index) => ({
                          byteSize: Math.min(
                            partSize,
                            byteSize - index * partSize
                          ),
                          partNumber: index + 1,
                          request: signed(id, {}, index + 1),
                        })
                      ),
                    },
            };
          }),
        delete: ({ params }) =>
          Effect.gen(function* remove() {
            yield* allowed("media:delete");

            const found = yield* findMedia(studio, params.mediaId);

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              media: current.media.filter(({ id }) => id !== found.id),
            }));
            yield* record(studio, `delete-media:${found.id}`);
          }),
        describe: ({ params, payload }) =>
          Effect.gen(function* describe() {
            yield* allowed("media:upload");

            const found = yield* findMedia(studio, params.mediaId);

            yield* record(studio, `describe-media:${found.id}`);

            return yield* saveMedia(studio, {
              ...found,
              altText: payload.altText,
            });
          }),
        get: ({ params }) =>
          allowed("media:read").pipe(
            Effect.andThen(findMedia(studio, params.mediaId))
          ),
        // What the address stands for, by its host: one the server does not
        // fetch, one that answers too slowly, one that has no such file.
        importFromUrl: ({ params, payload }) =>
          Effect.gen(function* importFromUrl() {
            yield* allowed("media:upload");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            if (!URL.canParse(payload.url)) {
              return yield* new MediaSourceNotPublic();
            }

            const { hostname, pathname, protocol } = new URL(payload.url);

            if (protocol !== "https:" || hostname === "intranet.example.test") {
              return yield* new MediaSourceNotPublic();
            }

            if (hostname === "slow.example.test") {
              return yield* new MediaSourceUnreachable({
                reason: "tooSlow",
                status: null,
              });
            }

            if (pathname.endsWith("/missing.png")) {
              return yield* new MediaSourceUnreachable({
                reason: "badStatus",
                status: 404,
              });
            }

            if (pathname.endsWith(".pdf")) {
              return yield* new UnsupportedMediaType({
                contentType: "application/pdf",
              });
            }

            const { media: all } = yield* Ref.get(studio.state);
            const id = nextId("f", all.length);

            yield* record(studio, `import:${id}:${payload.url}`);

            return yield* saveMedia(
              studio,
              image(id, {
                altText: payload.altText ?? null,
                createdAt: studioNow,
                updatedAt: studioNow,
              })
            );
          }),
        list: ({ params, query }) =>
          Effect.gen(function* list() {
            yield* allowed("media:read");

            const { media: all } = yield* Ref.get(studio.state);
            const listed = params.workspaceId === studioId ? all : [];

            const start =
              query.cursor === undefined
                ? 0
                : listed.findIndex(({ id }) => id === query.cursor) + 1;

            const limit = query.limit ?? 30;
            const items = listed.slice(start, start + limit);
            const last = items.at(-1);

            return {
              items,
              nextCursor:
                last !== undefined && start + limit < listed.length
                  ? last.id
                  : null,
            };
          }),
        // The drafts and the scheduled posts that show it, as the server
        // reads them from each post's content.
        usage: ({ params }) =>
          Effect.gen(function* usage() {
            yield* allowed("media:read");

            const found = yield* findMedia(studio, params.mediaId);
            const { posts: all } = yield* Ref.get(studio.state);

            const showing = all.filter((post) =>
              post.content.media.some(({ mediaId }) => mediaId === found.id)
            );

            return {
              drafts: showing
                .filter(({ status }) => status === "draft")
                .map(({ id }) => id),
              scheduled: showing
                .filter(({ status }) => status !== "draft")
                .map(({ id }) => id),
            };
          }),
      })
    ),
    HttpApiBuilder.group(Api, "analytics", (handlers) =>
      handlers.handleAll({
        bestTimes: ({ query }) =>
          Effect.gen(function* bestTimes() {
            yield* allowed("analytics:read");

            if (query.channelId !== mastodonId) {
              return yield* new ChannelNotFound();
            }

            return {
              best: [studioHour("tuesday", 9, 13, 4)],
              buckets: [
                studioHour("tuesday", 9, 13, 4),
                studioHour("friday", 18, null, 2),
              ],
              channelId: mastodonId,
              counted: true,
              days: query.days ?? 90,
              enough: true,
              from: "2026-08-12",
              minimumPosts: 20,
              minimumPostsPerHour: 3,
              platform: "mastodon" as const,
              posts: 24,
              recent: 1,
              timeZone: query.timeZone,
              to: "2026-11-09",
            };
          }),
        channel: ({ params, query }) =>
          Effect.gen(function* channel() {
            yield* allowed("analytics:read");
            yield* record(
              studio,
              `channel:${params.channelId}:${String(query.days)}:${query.timeZone}`
            );

            return {
              channelId: params.channelId,
              days: [
                {
                  date: "2026-11-08",
                  followers: 320,
                  following: 41,
                  likes: 12,
                  posts: 77,
                  quotes: 1,
                  reach: null,
                  replies: 3,
                  reposts: 4,
                  views: null,
                },
                {
                  date: "2026-11-09",
                  followers: null,
                  following: null,
                  likes: 0,
                  posts: null,
                  quotes: 0,
                  reach: null,
                  replies: 0,
                  reposts: 0,
                  views: null,
                },
              ],
              followers: { current: 320, gained: 12 },
              from: "2026-11-08",
              platform: "mastodon" as const,
              timeZone: query.timeZone,
              to: "2026-11-09",
              totals: dashboardTotals,
            };
          }),
        dashboard: ({ query }) =>
          Effect.gen(function* dashboard() {
            yield* allowed("analytics:read");
            yield* record(
              studio,
              `dashboard:${String(query.days)}:${String(query.from)}:${String(query.to)}:${query.timeZone}`
            );

            const numbers = {
              followers: { current: 320, gained: 12 },
              previousFollowers: { current: 308, gained: -2 },
              // As on a Pinterest channel: the 90 days before 90 days are
              // gone in part.
              previousKept: query.days !== 90,
              previousTotals: { ...dashboardTotals, engagement: 10, likes: 6 },
              totals: dashboardTotals,
            };

            return {
              ...numbers,
              channels: [
                {
                  ...numbers,
                  channelId: mastodonId,
                  platform: "mastodon" as const,
                },
              ],
              days: [],
              from: query.from ?? "2026-11-03",
              platforms: [{ ...numbers, platform: "mastodon" as const }],
              previous: { from: "2026-10-27", to: "2026-11-02" },
              timeZone: query.timeZone,
              to: query.to ?? "2026-11-09",
              topPosts: [],
            };
          }),
        export: ({ query }) =>
          Effect.gen(function* exporting() {
            yield* allowed("analytics:read");
            yield* record(
              studio,
              `export:${query.kind}:${query.format ?? "csv"}:${String(query.days)}`
            );

            const rows = Stream.make(
              "date,channelId,platform,followers\r\n",
              `2026-11-08,${mastodonId},mastodon,320\r\n`
            ).pipe(Stream.encodeText);

            // Over 90 days, the server fails after the first rows.
            return query.days === 90
              ? Stream.concat(rows, Stream.die("synthetic failure midway"))
              : rows;
          }),
        post: ({ params }) =>
          allowed("analytics:read").pipe(
            Effect.as({
              postId: params.postId,
              targets:
                params.postId === finishedId
                  ? [
                      {
                        channelId: mastodonId,
                        collecting: true,
                        lastCollectedAt: at("2026-11-09T07:07:00Z"),
                        latest: {
                          clicks: null,
                          impressions: null,
                          likes: 12,
                          quotes: 1,
                          reach: null,
                          replies: 3,
                          reposts: 4,
                          saves: null,
                        },
                        permalink: "https://social.example.test/@studio/1",
                        publishedAt: at("2026-11-08T09:00:05Z"),
                        snapshots: [],
                        targetId: failedTargetId,
                      },
                    ]
                  : [],
            })
          ),
        summary: ({ query }) =>
          Effect.gen(function* summary() {
            yield* allowed("analytics:read");
            yield* record(
              studio,
              `summary:${query.from}:${query.to}:${query.timeZone}`
            );

            return {
              channels: [
                {
                  channelId: mastodonId,
                  impressions: null,
                  likes: 12,
                  posts: 1,
                  quotes: 1,
                  replies: 3,
                  reposts: 4,
                },
              ],
              days: [],
              from: query.from,
              timeZone: query.timeZone,
              to: query.to,
              topPosts: [
                {
                  channelId: mastodonId,
                  engagement: 20,
                  metrics: {
                    clicks: null,
                    impressions: null,
                    likes: 12,
                    quotes: 1,
                    reach: null,
                    replies: 3,
                    reposts: 4,
                    saves: null,
                  },
                  permalink: "https://social.example.test/@studio/1",
                  postId: finishedId,
                  publishedAt: at("2026-11-08T09:00:05Z"),
                  targetId: failedTargetId,
                },
              ],
              totals: {
                impressions: null,
                likes: 12,
                posts: 1,
                quotes: 1,
                replies: 3,
                reposts: 4,
              },
            };
          }),
      })
    ),
    HttpApiBuilder.group(Api, "billing", (handlers) =>
      handlers.handleAll({
        get: () => allowed("billing:read").pipe(Effect.as(billing)),
        standing: () =>
          Ref.get(studio.state).pipe(
            Effect.map(({ overPlan }) => (overPlan ? over : within))
          ),
      })
    ),
    HttpApiBuilder.group(Api, "shortLinks", (handlers) =>
      handlers.handleAll({
        get: ({ params }) =>
          allowed("analytics:read").pipe(
            Effect.flatMap(() =>
              params.linkId === shortLinkFixture.id
                ? Effect.succeed({
                    days: [
                      { clicks: 0, day: "2026-11-01" },
                      { clicks: 4, day: "2026-11-02" },
                      { clicks: 1, day: "2026-11-03" },
                    ],
                    link: { ...shortLinkFixture, clicks: 5 },
                    period: { from: "2026-11-01", to: "2026-11-03" },
                  })
                : Effect.fail(new ShortLinkNotFound())
            )
          ),
        list: ({ query }) =>
          allowed("analytics:read").pipe(
            Effect.as({
              items:
                query.postId === undefined ||
                query.postId === shortLinkFixture.postId
                  ? [shortLinkFixture]
                  : [],
              nextCursor: null,
              period: {
                from: query.from ?? "2026-10-05",
                to: query.to ?? "2026-11-03",
              },
            })
          ),
        setDefault: ({ payload }) =>
          allowed("organization:update").pipe(
            Effect.tap(() =>
              record(studio, `short-links-default:${String(payload.byDefault)}`)
            ),
            Effect.tap(() =>
              Ref.update(studio.state, (current) => ({
                ...current,
                shortLinksByDefault: payload.byDefault,
              }))
            ),
            Effect.as({
              ...shortLinkStatusFixture,
              byDefault: payload.byDefault,
            })
          ),
        status: () =>
          allowed("post:read").pipe(
            Effect.andThen(Ref.get(studio.state)),
            Effect.map(({ shortLinksByDefault }) => ({
              ...shortLinkStatusFixture,
              byDefault: shortLinksByDefault,
            }))
          ),
      })
    ),
    HttpApiBuilder.group(Api, "usage", (handlers) =>
      handlers.handleAll({
        get: ({ query }) =>
          allowed("billing:read").pipe(
            Effect.as(
              usageReport({
                from: query.from ?? "2026-11-01",
                to: query.to ?? "2026-11-03",
              })
            )
          ),
        partner: ({ params, query }) =>
          allowed("partner:read").pipe(
            Effect.andThen(
              params.workspaceId === studioId
                ? Effect.succeed(
                    partnerUsageReport(
                      {
                        from: query.from ?? "2026-11-01",
                        to: query.to ?? "2026-11-03",
                      },
                      query.before
                    )
                  )
                : Effect.fail(new PartnerNotFound())
            )
          ),
      })
    ),
    HttpApiBuilder.group(Api, "members", (handlers) =>
      handlers.handleAll({
        list: () =>
          inPerson.pipe(
            Effect.as([
              {
                email: "synthetic@example.test",
                joinedAt: at("2026-10-01T08:00:00Z"),
                name: "Synthetic User",
                role: "owner",
                userId,
              },
              {
                email: "sam@example.test",
                joinedAt: at("2026-10-02T08:00:00Z"),
                name: "Sam Example",
                role: "viewer",
                userId: "2d8a4b6c-5e3f-4a71-8cbd-3e4f5a6b7c8d",
              },
            ])
          ),
      })
    ),
    HttpApiBuilder.group(Api, "invitations", (handlers) =>
      handlers.handleAll({
        create: ({ payload }) =>
          Effect.gen(function* create() {
            yield* inPerson;
            yield* allowed("invitation:create");

            if (payload.email === "sam@example.test") {
              return yield* new AlreadyMember();
            }

            const sent: Invitation = {
              createdAt: at("2026-11-09T12:00:00Z"),
              email: payload.email,
              expiresAt: at("2026-11-16T12:00:00Z"),
              id: "0190f3a0-0000-7000-8000-00000000a002",
              inviterId: userId,
              role: payload.role,
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              invitations: [...current.invitations, sent],
            }));
            yield* record(studio, `invite:${payload.email}:${payload.role}`);

            return sent;
          }),
        list: () =>
          inPerson.pipe(
            Effect.andThen(allowed("invitation:create")),
            Effect.andThen(Ref.get(studio.state)),
            Effect.map(({ invitations }) => invitations)
          ),
        revoke: ({ params }) =>
          Effect.gen(function* revoke() {
            yield* inPerson;
            yield* allowed("invitation:cancel");

            const { invitations } = yield* Ref.get(studio.state);

            yield* invitations.some(({ id }) => id === params.invitationId)
              ? Effect.void
              : Effect.fail(new InvitationNotFound());

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              invitations: current.invitations.filter(
                ({ id }) => id !== params.invitationId
              ),
            }));
            yield* record(studio, `revoke:${params.invitationId}`);
          }),
      })
    ),
    HttpApiBuilder.group(Api, "account", (handlers) =>
      handlers.handleAll({
        closure: () => refusing,
        delete: () => refusing,
        export: () =>
          Effect.gen(function* exportData() {
            const now = yield* DateTime.now;

            yield* record(studio, "export");
            yield* Effect.flatten(Ref.get(studio.whileExporting));

            return HttpApiSchema.withHeaders({
              body: exported(now),
              headers: {
                "content-disposition": `attachment; filename="peal-data-${DateTime.formatIsoDateUtc(now)}.json"`,
              },
            });
          }),
        twoStep: () => refusing,
      })
    ),
    HttpApiBuilder.group(Api, "connectedApps", (handlers) =>
      handlers.handleAll({
        list: () => Effect.succeed([cli]),
        revoke: () => refusing,
      })
    ),
    HttpApiBuilder.group(Api, "connectLinks", (handlers) =>
      handlers.handleAll({
        create: ({ params, payload }) =>
          Effect.gen(function* create() {
            yield* allowed("channel:connect");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            if (payload.platform === "pinterest") {
              return yield* new ConnectFailed({
                reason: "platformNotSupported",
              });
            }

            // Only where the studio's partner account said.
            if (
              payload.returnUrl !== undefined &&
              !payload.returnUrl.startsWith("https://app.example.test/")
            ) {
              return yield* new ReturnUrlNotAllowed();
            }

            const now = at("2026-11-09T12:00:00Z");

            const link: ConnectLink = {
              channelId: payload.channelId ?? null,
              channelIds: [],
              completedAt: null,
              createdAt: now,
              expiresAt: DateTime.add(now, {
                hours: payload.expiresInHours ?? 168,
              }),
              failedAt: null,
              failure: null,
              id: newLinkId,
              platform: payload.platform,
              returnUrl: payload.returnUrl ?? null,
              status: "pending",
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              connectLinks: [link, ...current.connectLinks],
            }));
            yield* record(studio, `link:create:${payload.platform}`);

            return { link, url: newLinkUrl };
          }),
        get: ({ params }) =>
          Effect.gen(function* get() {
            yield* allowed("channel:read");

            const { connectLinks: links } = yield* Ref.get(studio.state);
            const found = links.find(({ id }) => id === params.linkId);

            return found ?? (yield* new ConnectLinkNotFound());
          }),
        list: ({ params }) =>
          allowed("channel:read").pipe(
            Effect.andThen(Ref.get(studio.state)),
            Effect.map(({ connectLinks }) =>
              params.workspaceId === studioId ? connectLinks : []
            )
          ),
        revoke: ({ params }) =>
          Effect.gen(function* revoke() {
            yield* allowed("channel:connect");

            const { connectLinks: links } = yield* Ref.get(studio.state);
            const found = links.find(({ id }) => id === params.linkId);

            if (found === undefined) {
              return yield* new ConnectLinkNotFound();
            }

            // One already over stays as it is.
            if (found.status !== "pending") {
              return found;
            }

            const revoked: ConnectLink = {
              ...found,
              completedAt: at("2026-11-09T12:00:00Z"),
              status: "revoked",
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              connectLinks: current.connectLinks.map((link) =>
                link.id === revoked.id ? revoked : link
              ),
            }));
            yield* record(studio, `link:revoke:${revoked.id}`);

            return revoked;
          }),
      })
    ),
    HttpApiBuilder.group(Api, "partnerAccount", (handlers) =>
      handlers.handleAll({
        close: () => refusing,
        createKey: () => refusing,
        get: ({ params }) =>
          allowed("partner:read").pipe(
            Effect.as(
              params.workspaceId === studioId
                ? {
                    canOpen: false,
                    partner: studioPartner,
                    usage: { channels: 5, days: [], workspaces: 2 },
                  }
                : { canOpen: false, partner: null, usage: null }
            )
          ),
        listKeys: () =>
          allowed("partner:read").pipe(
            Effect.as([
              {
                createdAt: at("2026-10-02T09:00:00Z"),
                expiresAt: null,
                id: "0190f3a0-0000-7000-8000-00000000e101",
                name: "backend",
                permissions: ["channel:read", "post:schedule"] as const,
                scopes: ["workspaces:read", "workspaces:write"] as const,
                start: "peal_partner_synt",
              },
            ])
          ),
        listWorkspaces: ({ query }) =>
          allowed("partner:read").pipe(
            Effect.map(() => {
              const found = customers.filter(
                (customer) =>
                  (query.externalId === undefined ||
                    customer.externalId === query.externalId) &&
                  (query.name === undefined ||
                    customer.name
                      .toLowerCase()
                      .includes(query.name.toLowerCase()))
              );

              return { next: null, total: found.length, workspaces: found };
            })
          ),
        open: () => refusing,
        overview: ({ query }) =>
          allowed("partner:read").pipe(
            Effect.as(
              query.before === "studio-health-next"
                ? {
                    account: null,
                    next: null,
                    total: 2,
                    workspaces: [healthOf(customers[1], 0, 0)],
                  }
                : {
                    account: { overPlan: false },
                    next: query.limit === 1 ? "studio-health-next" : null,
                    total: 2,
                    workspaces: [
                      healthOf(customers[0], 1, 2),
                      ...(query.limit === 1
                        ? []
                        : [healthOf(customers[1], 0, 0)]),
                    ],
                  }
            )
          ),
        revokeKey: () => refusing,
        update: () => refusing,
      })
    ),
    HttpApiBuilder.group(Api, "capabilities", (handlers) =>
      handlers.handleAll({
        channel: ({ params }) =>
          allowed("channel:read").pipe(
            Effect.andThen(channelIn(params)),
            Effect.map((channel) => ({
              account:
                channel.platform === "tiktok"
                  ? {
                      _tag: "read" as const,
                      blocked: null,
                      restrictions: [
                        {
                          _tag: "optionValues" as const,
                          field: "privacyLevel",
                          values: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
                        },
                        {
                          _tag: "optionFixed" as const,
                          field: "disableDuet",
                          value: true,
                        },
                        { _tag: "videoDuration" as const, maximumMs: 600_000 },
                        {
                          _tag: "mediaTypesRefused" as const,
                          contentTypes: ["image/jpeg" as const],
                        },
                        {
                          _tag: "optionNeedsReconnect" as const,
                          field: "replies",
                        },
                      ],
                    }
                  : { _tag: "unrestricted" as const },
              capabilities: capabilitiesOn(channel.platform),
              channelId: channel.id,
            }))
          ),
        platforms: () =>
          allowed("channel:read").pipe(
            Effect.as(describedPlatforms.map(capabilitiesOn))
          ),
      })
    ),
    HttpApiBuilder.group(Api, "lookups", (handlers) =>
      handlers.handleAll({
        list: ({ params }) =>
          allowed("channel:read").pipe(
            Effect.andThen(channelIn(params)),
            Effect.map(({ platform }) => capabilitiesOn(platform).lookups)
          ),
        run: ({ params, payload }) =>
          Effect.gen(function* run() {
            yield* allowed("channel:read");

            const channel = yield* channelIn(params);

            if (
              params.name === "tiktokCreator" &&
              channel.platform === "tiktok"
            ) {
              return {
                _tag: "tiktokCreator" as const,
                items: [tiktokAccount],
                nextCursor: null,
              };
            }

            if (channel.platform === "pinterest") {
              return (
                pinterestLookup(params.name, payload.boardId) ??
                (yield* new LookupInputInvalid())
              );
            }

            if (channel.platform !== "youtube") {
              return yield* new LookupNotFound();
            }

            if (params.name === "youtubeVideoCategories") {
              return payload.regionCode === "ZZ"
                ? yield* new LookupInputInvalid()
                : videoCategories;
            }

            if (params.name !== "youtubePlaylists") {
              return yield* new LookupNotFound();
            }

            return (
              playlistPage(payload.cursor) ?? (yield* new LookupInputInvalid())
            );
          }),
      })
    ),
    HttpApiBuilder.group(Api, "review", (handlers) =>
      handlers.handleAll({
        approve: ({ params, payload }) =>
          Effect.gen(function* approve() {
            yield* allowed("post:approve");

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            const { approvals } = yield* Ref.get(studio.state);

            const pending = approvals.find(
              (asked) => asked.postId === post.id && asked.status === "pending"
            );

            if (pending === undefined) {
              return yield* new ApprovalNotPending();
            }

            if (
              pending.id !== payload.approvalId ||
              pending.subjectHash !== payload.subjectHash
            ) {
              return yield* new ApprovalChanged();
            }

            const decided: ApprovalRequest = {
              ...pending,
              decision: {
                at: at("2026-11-10T09:00:00Z"),
                by: {
                  kind: "member",
                  linkId: null,
                  name: studio.me.user.name,
                  userId,
                },
              },
              status: "approved",
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              approvals: current.approvals.map((asked) =>
                asked.id === decided.id ? decided : asked
              ),
            }));
            yield* savePost(studio, { ...post, status: "scheduled" });
            yield* record(studio, `approve:${post.id}`);

            return { approval: decided, late: false };
          }),
        comment: ({ params, payload }) =>
          Effect.gen(function* addComment() {
            yield* allowed("post:create");

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            const { comments } = yield* Ref.get(studio.state);

            const written: ReviewComment = {
              anchor: null,
              author: {
                kind: "member",
                linkId: null,
                name: studio.me.user.name,
                userId,
              },
              createdAt: at("2026-11-10T09:00:00Z"),
              id: `0190f3a0-0000-7000-8000-00000000f${String(comments.length).padStart(3, "0")}`,
              parentId: payload.parentId ?? null,
              postId: post.id,
              resolved: null,
              text: payload.text,
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              comments: [...current.comments, written],
            }));
            yield* record(
              studio,
              [
                `comment:${post.id}:${payload.text}`,
                ...(payload.parentId === undefined ? [] : [payload.parentId]),
              ].join(":")
            );

            return written;
          }),
        createLink: ({ params, payload }) =>
          Effect.gen(function* createLink() {
            yield* allowed("post:approve");

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            const { links } = yield* Ref.get(studio.state);

            const link: ReviewLink = {
              access: payload.access,
              createdAt: at("2026-11-10T09:00:00Z"),
              createdBy: userId,
              expiresAt: at("2026-11-12T09:00:00Z"),
              id: `0190f3a0-0000-7000-8000-00000000a${String(links.length + 100)}`,
              postId: post.id,
              revokedAt: null,
              status: "active",
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              links: [link, ...current.links],
            }));
            yield* record(
              studio,
              `link:${post.id}:${payload.access}:${String(payload.expiresInHours ?? "default")}`
            );

            return {
              link,
              token: "synthetic-token",
              url: "https://peal.example.test/review#synthetic-token",
            };
          }),
        links: ({ params }) =>
          Effect.gen(function* listLinks() {
            yield* allowed("post:read");
            yield* findPost(studio, params.workspaceId, params.postId);

            const { links } = yield* Ref.get(studio.state);

            return links.filter(({ postId }) => postId === params.postId);
          }),
        pending: ({ params }) =>
          Effect.gen(function* pending() {
            yield* allowed("post:read");

            const { approvals } = yield* Ref.get(studio.state);

            return params.workspaceId === studioId
              ? approvals.filter(({ status }) => status === "pending")
              : [];
          }),
        requestChanges: ({ params, payload }) =>
          Effect.gen(function* requestChanges() {
            yield* allowed("post:approve");

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            const { approvals } = yield* Ref.get(studio.state);

            const pending = approvals.find(
              (asked) => asked.postId === post.id && asked.status === "pending"
            );

            if (pending === undefined) {
              return yield* new ApprovalNotPending();
            }

            if (
              pending.id !== payload.approvalId ||
              pending.subjectHash !== payload.subjectHash
            ) {
              return yield* new ApprovalChanged();
            }

            const by = {
              kind: "member" as const,
              linkId: null,
              name: studio.me.user.name,
              userId,
            };

            const decided: ApprovalRequest = {
              ...pending,
              decision: { at: at("2026-11-10T09:00:00Z"), by },
              status: "changesRequested",
            };

            yield* savePost(studio, {
              ...post,
              schedule: null,
              status: "draft",
            });
            yield* record(
              studio,
              `requestChanges:${post.id}:${payload.comment}`
            );

            return {
              approval: decided,
              comment: {
                anchor: null,
                author: by,
                createdAt: at("2026-11-10T09:00:00Z"),
                id: "0190f3a0-0000-7000-8000-00000000f900",
                parentId: null,
                postId: post.id,
                resolved: null,
                text: payload.comment,
              },
            };
          }),
        resolve: () => refusing,
        revokeLink: ({ params }) =>
          Effect.gen(function* revokeLink() {
            yield* allowed("post:approve");

            const { links } = yield* Ref.get(studio.state);
            const link = links.find(({ id }) => id === params.linkId);

            if (link === undefined || params.workspaceId !== studioId) {
              return yield* new ReviewLinkNotFound();
            }

            yield* record(studio, `revoke:${link.id}`);

            return {
              ...link,
              revokedAt: at("2026-11-10T09:30:00Z"),
              status: "revoked" as const,
            };
          }),
        settings: () =>
          Effect.gen(function* settings() {
            yield* allowed("post:read");

            return { approvalPolicy: (yield* Ref.get(studio.state)).policy };
          }),
        thread: ({ params }) =>
          Effect.gen(function* thread() {
            yield* allowed("post:read");

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            const { approvals, comments } = yield* Ref.get(studio.state);

            return {
              approvals: approvals.filter(
                ({ postId }) => postId === params.postId
              ),
              channels: post.targets.map(({ channelId }) => ({
                channelId,
                followUps: [],
                handle: "@studio@social.example.test",
                options:
                  post.targets.find((target) => target.channelId === channelId)
                    ?.options ?? null,
                platform: "mastodon" as const,
                text: post.content.text,
              })),
              comments: comments.filter(
                ({ postId }) => postId === params.postId
              ),
              media: [],
            };
          }),
        updateSettings: ({ payload }) =>
          Effect.gen(function* updateSettings() {
            yield* allowed("organization:update");
            yield* Ref.update(studio.state, (current) => ({
              ...current,
              policy: payload.approvalPolicy,
            }));
            yield* record(studio, `policy:${payload.approvalPolicy}`);

            return payload;
          }),
      })
    ),
    HttpApiBuilder.group(Api, "webhooks", (handlers) =>
      handlers.handleAll({
        create: ({ params, payload }) =>
          Effect.gen(function* create() {
            yield* allowed("webhook:manage");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            const current = yield* Ref.get(studio.state);

            if (current.webhooks.length >= maxWebhookEndpoints) {
              return yield* new TooManyWebhookEndpoints({
                allowed: maxWebhookEndpoints,
              });
            }

            yield* acceptedUrl(payload.url);

            if (!current.signingKeys) {
              return yield* new WebhooksNotConfigured();
            }

            const enabled = payload.enabled ?? true;
            const now = at("2026-11-09T12:00:00Z");

            const endpoint = yield* saveEndpoint(studio, {
              channelIds: payload.channelIds ?? [],
              createdAt: now,
              description: payload.description ?? "",
              disabledAt: enabled ? null : now,
              disabledReason: enabled ? null : "manual",
              enabled,
              eventTypes: payload.eventTypes,
              failingSince: null,
              // Names only: the values are never answered.
              headerNames: (payload.headers ?? []).map(({ name }) => name),
              id: `0190f3a0-0000-7000-8000-00000000b${String(current.webhooks.length + 1).padStart(3, "0")}`,
              previousSecretExpiresAt: null,
              scope: payload.scope ?? "workspace",
              updatedAt: now,
              url: payload.url,
              workspaceIds: payload.workspaceIds ?? [],
            });

            yield* record(studio, `webhook:create:${endpoint.url}`);
            yield* record(studio, `webhook:secret:${endpoint.id}`);

            return { endpoint, secret: secretAfter(current.changes) };
          }),
        delete: ({ params }) =>
          Effect.gen(function* remove() {
            yield* allowed("webhook:manage");

            const endpoint = yield* findEndpoint(
              studio,
              params.workspaceId,
              params.endpointId
            );

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              deliveries: current.deliveries.filter(
                ({ endpointId }) => endpointId !== endpoint.id
              ),
              webhooks: current.webhooks.filter(({ id }) => id !== endpoint.id),
            }));
            yield* record(studio, `webhook:delete:${endpoint.id}`);
          }),
        get: ({ params }) =>
          allowed("webhook:read").pipe(
            Effect.andThen(
              findEndpoint(studio, params.workspaceId, params.endpointId)
            )
          ),
        list: ({ params }) =>
          allowed("webhook:read").pipe(
            Effect.andThen(Ref.get(studio.state)),
            Effect.map(({ webhooks: all }) =>
              params.workspaceId === studioId ? all : []
            )
          ),
        listDeliveries: ({ params, query }) =>
          Effect.gen(function* listDeliveries() {
            yield* allowed("webhook:read");

            const endpoint = yield* findEndpoint(
              studio,
              params.workspaceId,
              params.endpointId
            );

            const { deliveries: all } = yield* Ref.get(studio.state);

            return pageOf(
              all
                .filter(({ endpointId }) => endpointId === endpoint.id)
                .map(({ delivery }) => delivery),
              query
            );
          }),
        redeliver: ({ params }) =>
          Effect.gen(function* redeliver() {
            yield* allowed("webhook:manage");

            const endpoint = yield* findEndpoint(
              studio,
              params.workspaceId,
              params.endpointId
            );

            const { deliveries: all } = yield* Ref.get(studio.state);

            const past = all.find(
              ({ delivery, endpointId }) =>
                endpointId === endpoint.id && delivery.id === params.deliveryId
            );

            if (past === undefined) {
              return yield* new WebhookDeliveryNotFound();
            }

            const again = yield* deliverTo(
              studio,
              endpoint,
              { id: past.delivery.eventId, type: past.delivery.eventType },
              past.delivery.id
            );

            yield* record(studio, `webhook:redeliver:${past.delivery.id}`);

            return again;
          }),
        redeliverMany: ({ params, payload }) =>
          Effect.gen(function* redeliverMany() {
            yield* allowed("webhook:manage");

            if (params.workspaceId !== studioId) {
              return yield* new WebhookEndpointNotFound();
            }

            const { deliveries: all, webhooks: endpoints } = yield* Ref.get(
              studio.state
            );

            if ("endpointId" in payload) {
              yield* findEndpoint(
                studio,
                params.workspaceId,
                payload.endpointId
              );
            }

            const chosen =
              "deliveryIds" in payload
                ? payload.deliveryIds.map((id) => ({
                    found: all.find(({ delivery }) => delivery.id === id),
                    id,
                  }))
                : all
                    .filter(
                      ({ delivery, endpointId }) =>
                        endpointId === payload.endpointId &&
                        delivery.status === "failed"
                    )
                    .toReversed()
                    .map((found) => ({ found, id: found.delivery.id }));

            const redelivered: WebhookDelivery[] = [];

            const skipped: {
              readonly deliveryId: string;
              readonly reason: "endpointDisabled" | "notFound";
            }[] = [];

            for (const { found, id } of chosen) {
              const endpoint = endpoints.find(
                ({ id: endpointId }) => endpointId === found?.endpointId
              );

              if (found === undefined || endpoint === undefined) {
                skipped.push({ deliveryId: id, reason: "notFound" });
              } else if (endpoint.enabled) {
                redelivered.push(
                  yield* deliverTo(
                    studio,
                    endpoint,
                    {
                      id: found.delivery.eventId,
                      type: found.delivery.eventType,
                    },
                    found.delivery.id
                  ).pipe(
                    // It is on: checked above.
                    Effect.catchTag("WebhookEndpointDisabled", Effect.die)
                  )
                );
              } else {
                skipped.push({ deliveryId: id, reason: "endpointDisabled" });
              }
            }

            yield* record(
              studio,
              `webhook:redeliver-many:${redelivered.map(({ redeliveryOf }) => redeliveryOf).join(",")}`
            );

            return { redelivered, remaining: 0, skipped };
          }),
        rotateSecret: ({ params }) =>
          Effect.gen(function* rotateSecret() {
            yield* allowed("webhook:manage");

            const found = yield* findEndpoint(
              studio,
              params.workspaceId,
              params.endpointId
            );

            const current = yield* Ref.get(studio.state);

            if (!current.signingKeys) {
              return yield* new WebhooksNotConfigured();
            }

            const endpoint = yield* saveEndpoint(studio, {
              ...found,
              previousSecretExpiresAt: at("2026-11-10T12:00:00Z"),
              updatedAt: at("2026-11-09T12:00:00Z"),
            });

            yield* record(studio, `webhook:secret:${endpoint.id}`);

            return { endpoint, secret: secretAfter(current.changes) };
          }),
        searchDeliveries: ({ params, query }) =>
          Effect.gen(function* searchDeliveries() {
            yield* allowed("webhook:read");

            const { deliveries: all } = yield* Ref.get(studio.state);

            return pageOf(
              params.workspaceId === studioId
                ? all
                    .filter(
                      ({ endpointId }) =>
                        query.endpointId === undefined ||
                        endpointId === query.endpointId
                    )
                    .map(({ delivery }) => delivery)
                : [],
              query
            );
          }),
        sendTest: ({ params, query }) =>
          Effect.gen(function* sendTest() {
            yield* allowed("webhook:manage");

            const endpoint = yield* findEndpoint(
              studio,
              params.workspaceId,
              params.endpointId
            );

            const delivery = yield* deliverTo(studio, endpoint, {
              id: "0190f3a0-0000-7000-8000-00000000ee99",
              type: query.eventType ?? "webhook.test",
            });

            yield* record(
              studio,
              `webhook:test:${endpoint.id}${query.eventType === undefined ? "" : `:${query.eventType}`}`
            );

            return delivery;
          }),
        update: ({ params, payload }) =>
          Effect.gen(function* update() {
            yield* allowed("webhook:manage");

            const found = yield* findEndpoint(
              studio,
              params.workspaceId,
              params.endpointId
            );

            if (payload.url !== undefined) {
              yield* acceptedUrl(payload.url);
            }

            const enabled = payload.enabled ?? found.enabled;
            const now = at("2026-11-09T12:00:00Z");

            yield* record(
              studio,
              `webhook:update:${found.id}:${Object.keys(payload).toSorted().join(",")}`
            );

            const { headers, ...changed } = payload;

            const headerNames =
              headers === undefined
                ? found.headerNames
                : headers.map(({ name }) => name);

            return yield* saveEndpoint(studio, {
              ...found,
              ...changed,
              disabledAt: enabled ? null : (found.disabledAt ?? now),
              disabledReason: enabled
                ? null
                : (found.disabledReason ?? "manual"),
              enabled,
              failingSince:
                enabled && !found.enabled ? null : found.failingSince,
              headerNames,
              updatedAt: now,
            });
          }),
      })
    ),
    studioInboxLive(studio.inbox),
    HttpApiBuilder.group(Api, "tags", (handlers) =>
      handlers.handleAll({
        create: ({ params, payload }) =>
          Effect.gen(function* create() {
            yield* allowed("post:update");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            yield* checkTagName(studio, payload.name);

            const { changes, tags: all } = yield* Ref.get(studio.state);

            if (all.length >= maxTagsPerWorkspace) {
              return yield* new TooManyTags({ allowed: maxTagsPerWorkspace });
            }

            // An id no tag had, deleted ones included.
            const made =
              changes.filter((change) => change.startsWith("tag:create:"))
                .length +
              tags.length +
              1;

            const tag: Tag = {
              colour: payload.colour,
              createdAt: studioNow,
              id: `0190f3a0-0000-7000-8000-00000000a${String(made).padStart(3, "0")}`,
              name: payload.name,
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              tags: [...current.tags, tag],
            }));
            yield* record(studio, `tag:create:${tag.name}:${tag.colour}`);

            return tag;
          }),
        delete: ({ params }) =>
          Effect.gen(function* remove() {
            yield* allowed("post:update");

            const tag = yield* findTag(studio, params);

            // Its posts lose it, and stay.
            yield* Ref.update(studio.state, (current) => ({
              ...current,
              posts: current.posts.map((post) => ({
                ...post,
                tagIds: post.tagIds.filter((tagId) => tagId !== tag.id),
              })),
              tags: current.tags.filter(({ id }) => id !== tag.id),
            }));
            yield* record(studio, `tag:delete:${tag.id}`);
          }),
        list: ({ params }) =>
          allowed("post:read").pipe(
            Effect.andThen(Ref.get(studio.state)),
            Effect.map(({ tags: all }) =>
              params.workspaceId === studioId ? all : []
            )
          ),
        update: ({ params, payload }) =>
          Effect.gen(function* update() {
            yield* allowed("post:update");

            const tag = yield* findTag(studio, params);

            yield* checkTagName(studio, payload.name, tag.id);

            const changed: Tag = { ...tag, ...payload };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              tags: current.tags.map((found) =>
                found.id === tag.id ? changed : found
              ),
            }));
            yield* record(
              studio,
              `tag:update:${tag.id}:${changed.name}:${changed.colour}`
            );

            return changed;
          }),
      })
    ),
    HttpApiBuilder.group(Api, "signatures", (handlers) =>
      handlers.handleAll({
        create: ({ params, payload }) =>
          Effect.gen(function* create() {
            yield* allowed("post:update");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            const scope = yield* checkSignature(studio, payload);
            const { changes, signatures: all } = yield* Ref.get(studio.state);

            if (all.length >= maxSignaturesPerWorkspace) {
              return yield* new TooManySignatures({
                allowed: maxSignaturesPerWorkspace,
              });
            }

            // An id no signature had, deleted ones included.
            const made =
              changes.filter((change) => change.startsWith("signature:create:"))
                .length +
              signatures.length +
              1;

            const kept: Signature = {
              createdAt: studioNow,
              id: `0190f3a0-0000-7000-8000-00000000a1${String(made).padStart(2, "0")}`,
              isDefault: payload.isDefault ?? false,
              name: payload.name,
              scope,
              text: payload.text,
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              signatures: withSignature(current.signatures, kept),
            }));
            yield* record(
              studio,
              `signature:create:${kept.name}:${scopeKey(scope)}:${kept.isDefault ? "default" : "plain"}`
            );

            return kept;
          }),
        delete: ({ params }) =>
          Effect.gen(function* remove() {
            yield* allowed("post:update");

            const gone = yield* findSignature(studio, params);

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              signatures: current.signatures.filter(({ id }) => id !== gone.id),
            }));
            yield* record(studio, `signature:delete:${gone.id}`);
          }),
        list: ({ params }) =>
          allowed("post:read").pipe(
            Effect.andThen(Ref.get(studio.state)),
            Effect.map(({ signatures: all }) =>
              params.workspaceId === studioId ? all : []
            )
          ),
        update: ({ params, payload }) =>
          Effect.gen(function* update() {
            yield* allowed("post:update");

            const kept = yield* findSignature(studio, params);
            const scope = yield* checkSignature(studio, payload, kept.id);

            const changed: Signature = {
              ...kept,
              isDefault: payload.isDefault ?? false,
              name: payload.name,
              scope,
              text: payload.text,
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              signatures: withSignature(current.signatures, changed),
            }));
            yield* record(
              studio,
              `signature:update:${changed.id}:${changed.name}:${scopeKey(scope)}:${changed.isDefault ? "default" : "plain"}`
            );

            return changed;
          }),
      })
    ),
    HttpApiBuilder.group(Api, "channelSets", (handlers) =>
      handlers.handleAll({
        create: ({ params, payload }) =>
          Effect.gen(function* create() {
            yield* allowed("post:update");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            yield* checkSet(studio, payload);

            const { changes, channelSets: all } = yield* Ref.get(studio.state);

            if (all.length >= maxChannelSetsPerWorkspace) {
              return yield* new TooManyChannelSets({
                allowed: maxChannelSetsPerWorkspace,
              });
            }

            // An id no set had, deleted ones included.
            const made =
              changes.filter((change) => change.startsWith("set:create:"))
                .length +
              channelSets.length +
              1;

            const set: StudioSet = {
              channelIds: payload.channelIds,
              createdAt: studioNow,
              id: `0190f3a0-0000-7000-8000-00000000a2${String(made).padStart(2, "0")}`,
              name: payload.name,
              options: payload.options ?? [],
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              channelSets: [...current.channelSets, set],
            }));
            yield* record(
              studio,
              `set:create:${set.name}:${set.channelIds.join(",")}`
            );

            return setView(set);
          }),
        delete: ({ params }) =>
          Effect.gen(function* remove() {
            yield* allowed("post:update");

            const set = yield* findSet(studio, params);

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              channelSets: current.channelSets.filter(
                ({ id }) => id !== set.id
              ),
            }));
            yield* record(studio, `set:delete:${set.id}`);
          }),
        list: ({ params }) =>
          allowed("post:read").pipe(
            Effect.andThen(allowed("channel:read")),
            Effect.andThen(Ref.get(studio.state)),
            Effect.map(({ channelSets: all }) =>
              params.workspaceId === studioId ? all.map(setView) : []
            )
          ),
        update: ({ params, payload }) =>
          Effect.gen(function* update() {
            yield* allowed("post:update");

            const set = yield* findSet(studio, params);

            yield* checkSet(studio, payload, set.id);

            const changed: StudioSet = {
              ...set,
              channelIds: payload.channelIds,
              name: payload.name,
              options: payload.options ?? [],
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              channelSets: current.channelSets.map((found) =>
                found.id === set.id ? changed : found
              ),
            }));
            yield* record(
              studio,
              `set:update:${set.id}:${changed.name}:${changed.channelIds.join(",")}`
            );

            return setView(changed);
          }),
      })
    ),
    HttpApiBuilder.group(Api, "channelDefaults", (handlers) =>
      handlers.handleAll({
        clear: ({ params }) =>
          Effect.gen(function* clear() {
            yield* allowed("post:update");

            const channel = yield* channelIn(params);

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              defaults: Object.fromEntries(
                Object.entries(current.defaults).filter(
                  ([channelId]) => channelId !== channel.id
                )
              ),
            }));
            yield* record(studio, `defaults:clear:${channel.id}`);
          }),
        get: ({ params }) =>
          Effect.gen(function* get() {
            yield* allowed("post:read");

            const channel = yield* channelIn(params);
            const { defaults } = yield* Ref.get(studio.state);

            return { options: defaults[channel.id] ?? null };
          }),
        set: ({ params, payload }) =>
          Effect.gen(function* set() {
            yield* allowed("post:update");

            const channel = yield* channelIn(params);

            yield* checkOptions([
              { channelId: channel.id, options: payload.options },
            ]);
            yield* Ref.update(studio.state, (current) => ({
              ...current,
              defaults: { ...current.defaults, [channel.id]: payload.options },
            }));
            yield* record(studio, `defaults:set:${channel.id}`);

            return { options: payload.options };
          }),
      })
    ),
    HttpApiBuilder.group(Api, "activity", (handlers) =>
      handlers.handleAll({
        list: ({ params, query }) =>
          Effect.gen(function* list() {
            const member = yield* CurrentMember;

            // As the server words it, for the member it refuses.
            if (!member.permissions.includes("activity:read")) {
              return yield* new Forbidden({
                message:
                  "Your role in this workspace does not have the permission activity:read. An owner or an admin of the workspace changes roles, in its settings.",
                permission: "activity:read",
                reason: "missingPermission",
              });
            }

            const listed = (
              params.workspaceId === studioId ? activityLog : []
            ).filter(
              (event) =>
                (query.operation === undefined ||
                  event.operation === query.operation) &&
                (query.actor === undefined || actorIdOf(event) === query.actor)
            );

            const start =
              query.cursor === undefined
                ? 0
                : listed.findIndex(({ id }) => id === query.cursor) + 1;

            const limit = query.limit ?? 30;
            const items = listed.slice(start, start + limit);
            const last = items.at(-1);

            return {
              items,
              nextCursor:
                last !== undefined && start + limit < listed.length
                  ? last.id
                  : null,
            };
          }),
      })
    ),
    HttpApiBuilder.group(Api, "tiktok", (handlers) =>
      handlers.handleAll({
        creator: ({ params }) =>
          allowed("post:create").pipe(
            Effect.andThen(
              params.workspaceId === studioId && params.channelId === tiktokId
                ? Effect.succeed(tiktokAccount)
                : Effect.fail(new ChannelNotFound())
            )
          ),
      })
    )
  );

/**
 * WorkspaceAccess as the server has it: the user, as a member of the
 * workspace in the path, with what their role allows there.
 */
export const studioAccessLive = (studio: Studio) =>
  Layer.succeed(
    WorkspaceAccess,
    WorkspaceAccess.of((httpEffect) =>
      Effect.gen(function* member() {
        const principal = yield* CurrentPrincipal;
        const params = yield* HttpRouter.params;

        // A key acts in its own workspace alone, with its own permissions.
        if (principal._tag === "apiKey") {
          if (principal.workspaceId !== params["workspaceId"]) {
            return yield* wrongWorkspace;
          }

          return yield* httpEffect.pipe(
            Effect.provideService(CurrentMember, {
              permissions: principal.permissions,
              principal,
              workspaceId: principal.workspaceId,
            })
          );
        }

        const workspace = studio.me.workspaces.find(
          ({ id }) => id === params["workspaceId"]
        );

        if (workspace === undefined) {
          return yield* new WorkspaceNotFound();
        }

        // A workspace that requires two-step verification refuses a
        // person whose account does not have it on.
        if (workspace.twoStepRequired && !studio.me.user.twoStepEnabled) {
          return yield* new Forbidden({
            code: "forbidden",
            message:
              "This workspace requires two-step verification. Turn it on in your Peal account settings, then try again.",
            reason: "twoStepRequired",
          });
        }

        return yield* httpEffect.pipe(
          Effect.provideService(CurrentMember, {
            permissions: workspace.permissions,
            principal,
            workspaceId: workspace.id,
          })
        );
      })
    )
  );
