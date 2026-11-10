import { DateTime, Effect, Layer, Option, Ref } from "effect";
import { HttpRouter } from "effect/http";
import { HttpApiBuilder, HttpApiError, HttpApiSchema } from "effect/http-api";
import {
  AlreadyMember,
  Api,
  ChannelNotFound,
  CurrentMember,
  CurrentPrincipal,
  Forbidden,
  DuplicatePost,
  IdempotencyKeyReused,
  importColumns,
  ImportUnreadable,
  InvalidTimeRange,
  InvalidTimeZone,
  InvitationNotFound,
  maxImportRows,
  maxWebhookEndpoints,
  MediaNotFound,
  MediaSourceNotPublic,
  MediaSourceUnreachable,
  MediaTooLarge,
  PostContentInvalid,
  PostNotFound,
  PostStatusConflict,
  ScheduleInPast,
  TargetStatusConflict,
  TooManyWebhookEndpoints,
  Unauthenticated,
  UnknownChannels,
  UnknownMedia,
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
  AccountExport,
  ActivityEvent,
  Billing,
  Channel,
  ChannelOptions,
  ChannelPreview,
  ConnectedApp,
  ContentViolation,
  DuplicateOnChannel,
  ImportCellProblem,
  ImportColumn,
  ImportRowResult,
  Invitation,
  Me,
  Media,
  MediaContentType,
  NewPost,
  Permission,
  Post,
  PostContent,
  PostDraft,
  PostOrigin,
  PostSort,
  PostTarget,
  PostValidation,
  PublicationAttempt,
  ScheduleCheck,
  SignedRequest,
  Standing,
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

// A synthetic Peal instance's data, in memory, for the commands that act in
// a workspace: two workspaces, their channels, posts, members and
// invitations, and the account's own data. Handlers check the member's
// permissions as the server does, and record the changes they make.

const at = (iso: string) => DateTime.makeUnsafe(iso);

export const studioId = "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60";

export const shopId = "6c1d7f75-6e1a-4b8f-8b63-4a2d3e5f6071";

export const userId = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const everything: readonly Permission[] = [
  "activity:read",
  "analytics:read",
  "billing:read",
  "channel:read",
  "invitation:create",
  "invitation:cancel",
  "media:read",
  "media:upload",
  "media:delete",
  "post:read",
  "post:create",
  "post:update",
  "post:delete",
  "post:schedule",
  "webhook:read",
  "webhook:manage",
];

const reading: readonly Permission[] = [
  "analytics:read",
  "channel:read",
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
  },
  workspaces: [
    {
      id: studioId,
      name: "Studio",
      permissions: everything,
      role: "owner",
      slug: "studio",
    },
    {
      id: shopId,
      name: "Shop",
      permissions: reading,
      role: "viewer",
      slug: "shop",
    },
  ],
};

export const mastodonId = "0190f3a0-0000-7000-8000-00000000c001";

export const blueskyId = "0190f3a0-0000-7000-8000-00000000c002";

export const tiktokId = "0190f3a0-0000-7000-8000-00000000c003";

export const youtubeId = "0190f3a0-0000-7000-8000-00000000c004";

export const instagramId = "0190f3a0-0000-7000-8000-00000000c005";

const channels: readonly Channel[] = [
  {
    avatarUrl: null,
    connection: null,
    displayName: "Studio",
    handle: "@studio@example.social",
    id: mastodonId,
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
    platform: "instagram",
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

export const failedTargetId = "0190f3a0-0000-7000-8000-00000000e001";

export const unconfirmedTargetId = "0190f3a0-0000-7000-8000-00000000e002";

export const quotaTargetId = "0190f3a0-0000-7000-8000-00000000e003";

const pendingOn = (id: string, channelId: string): PostTarget => ({
  channelId,
  failureReason: null,
  id,
  options: null,
  permalink: null,
  publishedAt: null,
  round: 1,
  status: "pending",
  unconfirmedReason: null,
});

const content = (text: string) => ({ media: [], overrides: [], text });

const posts: readonly Post[] = [
  {
    authorId: userId,
    content: content("A synthetic draft about the spring catalogue."),
    createdVia: null,
    id: draftId,
    outcome: null,
    schedule: null,
    scheduledBy: null,
    scheduledVia: null,
    status: "draft",
    targets: [pendingOn("0190f3a0-0000-7000-8000-00000000e010", mastodonId)],
  },
  {
    authorId: userId,
    content: content("A synthetic post that goes out next week."),
    createdVia: null,
    id: scheduledId,
    outcome: null,
    schedule: { at: at("2026-11-20T09:00:00Z"), timeZone: "Europe/Paris" },
    scheduledBy: null,
    scheduledVia: null,
    status: "scheduled",
    targets: [pendingOn("0190f3a0-0000-7000-8000-00000000e011", mastodonId)],
  },
  {
    authorId: userId,
    content: content("A synthetic post that went out yesterday."),
    createdVia: null,
    id: finishedId,
    outcome: "failed",
    schedule: { at: at("2026-11-08T09:00:00Z"), timeZone: "Europe/Paris" },
    scheduledBy: null,
    scheduledVia: null,
    status: "finished",
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
    refusalCode: "429",
    result: "rateLimited",
    retryAt: null,
    round: 1,
    startedAt: at("2026-11-08T09:05:00Z"),
    targetId: failedTargetId,
  },
];

const invitation: Invitation = {
  createdAt: at("2026-11-01T10:00:00Z"),
  email: "guest@example.test",
  expiresAt: at("2026-11-08T10:00:00Z"),
  id: "0190f3a0-0000-7000-8000-00000000a001",
  inviterId: userId,
  role: "editor",
};

const within: Standing = {
  mustReduce: false,
  over: [],
  plan: "free",
  planWithRoom: null,
  scheduledPosts: 7,
};

// The studio after a trial: more channels and members than the free plan.
const over: Standing = {
  mustReduce: true,
  over: [
    { allowed: 3, limit: "channels", used: 8 },
    { allowed: 2, limit: "members", used: 5 },
    { allowed: 500_000_000, limit: "mediaStorage", used: 1_200_000_000 },
  ],
  plan: "free",
  planWithRoom: "pro",
  scheduledPosts: 7,
};

const billing: Billing = {
  allowances: {
    assistantRequests: 3,
    channels: 3,
    mediaStorage: 500_000_000,
    members: 2,
    scheduledPosts: 30,
  },
  currency: "eur",
  enabled: true,
  plan: "free",
  plans: [],
  subscription: null,
  trial: { available: true, days: 14, plan: "pro" },
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
      postFailed: true,
      postPublished: false,
      postUnconfirmed: true,
    },
    everyPost: false,
  },
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
  altText: null,
  byteSize: 2048,
  codec: null,
  contentType: "image/png",
  createdAt: at("2026-11-05T10:00:00Z"),
  dimensions: { height: 600, width: 800 },
  durationMs: null,
  id,
  kind: "image",
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
    createdAt: at("2026-11-01T10:00:00Z"),
    description: "Synthetic receiver",
    disabledAt: null,
    disabledReason: null,
    enabled: true,
    eventTypes: ["post.published", "post.failed"],
    failingSince: at("2026-11-09T11:00:00Z"),
    id: hookId,
    previousSecretExpiresAt: null,
    updatedAt: at("2026-11-01T10:00:00Z"),
    url: "https://hooks.example.com/peal",
  },
  {
    createdAt: at("2026-10-01T10:00:00Z"),
    description: "",
    disabledAt: at("2026-11-06T10:00:00Z"),
    disabledReason: "failing",
    enabled: false,
    eventTypes: ["media.ready"],
    failingSince: at("2026-11-01T10:00:00Z"),
    id: failingHookId,
    previousSecretExpiresAt: null,
    updatedAt: at("2026-11-06T10:00:00Z"),
    url: "https://hooks.example.com/old",
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
  eventType: WebhookEventType
): WebhookDelivery => ({
  attempts: 0,
  completedAt: null,
  createdAt: at("2026-11-09T12:00:00Z"),
  durationMs: null,
  error: null,
  eventId,
  eventType,
  failureReason: null,
  id,
  lastAttemptAt: null,
  nextAttemptAt: null,
  responseExcerpt: null,
  responseStatus: null,
  status: "pending",
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

/** What the instance holds, and what the commands changed. */
export interface StudioState {
  readonly changes: readonly string[];
  readonly deliveries: readonly StudioDelivery[];
  /** Whether the studio holds more than its plan allows, as a test sets it. */
  readonly overPlan: boolean;
  readonly invitations: readonly Invitation[];
  readonly media: readonly Media[];
  readonly posts: readonly Post[];
  /** The posts made under an idempotency key, with the request's body. */
  readonly sent: Readonly<
    Record<string, { readonly body: string; readonly postId: string }>
  >;
  /** What the media store answers a signed request with. */
  readonly storeStatus: number;
  readonly stored: readonly StoredRequest[];
  /** Whether the server has the keys that encrypt signing secrets. */
  readonly signingKeys: boolean;
  readonly webhooks: readonly WebhookEndpoint[];
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
    state: Ref.make<StudioState>({
      changes: [],
      deliveries,
      invitations: [invitation],
      media: [image(readyMediaId, { altText: "A synthetic catalogue cover" })],
      overPlan: false,
      posts,
      sent: {},
      signingKeys: true,
      storeStatus: 200,
      stored: [],
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

const nextId = (kind: "f" | "d", count: number) =>
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
const deliverTo = (
  studio: Studio,
  endpoint: WebhookEndpoint,
  event: { readonly id: string; readonly type: WebhookEventType }
) =>
  Effect.gen(function* delivering() {
    if (!endpoint.enabled) {
      return yield* new WebhookEndpointDisabled();
    }

    const { deliveries: all } = yield* Ref.get(studio.state);

    const delivery = pendingDelivery(
      `0190f3a0-0000-7000-8000-00000000f${String(all.length + 1).padStart(3, "0")}`,
      event.id,
      event.type
    );

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
  }
): DuplicateOnChannel[] =>
  payload.allowDuplicate === true
    ? []
    : payload.channelIds.flatMap((channelId) =>
        all
          .filter(
            (other) =>
              other.status !== "draft" &&
              other.status !== "cancelled" &&
              other.content.text === payload.content.text &&
              other.targets.some((target) => target.channelId === channelId)
          )
          .slice(0, 1)
          .map((other) => ({ channelId, postId: other.id }))
      );

// A new post's time: now is the studio's clock.
const timeOf = ({ when }: Pick<NewPost, "when">) =>
  when._tag === "now"
    ? { at: studioNow, timeZone: when.timeZone ?? "UTC" }
    : { at: when.at, timeZone: when.timeZone };

// Everything sending a post checks before making it, in the order the
// server answers: its channels, its media, its time, what its platforms
// refuse, and the posts that already send it.
const checkNewPost = (studio: Studio, payload: NewPost) =>
  Effect.gen(function* checkingNewPost() {
    yield* checkChannels(payload.channelIds);
    yield* checkMedia(studio, payload.content);

    const when = timeOf(payload);
    const status = yield* checkTime(when.at, when.timeZone);

    yield* checkContent(
      payload.channelIds,
      payload.content,
      payload.options ?? []
    );

    const { posts: all } = yield* Ref.get(studio.state);
    const duplicates = duplicatesOf(all, payload);

    if (duplicates.length > 0) {
      return yield* new DuplicatePost({ duplicates });
    }

    return { status, when };
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
      };
    }

    const body = JSON.stringify(payload);
    const before = yield* Ref.get(studio.state);
    const { status, when } = yield* checkNewPost(studio, payload);
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
      content: payload.content,
      createdVia: viaCommandLine,
      id,
      outcome: null,
      schedule: when,
      scheduledBy: userId,
      scheduledVia: viaCommandLine,
      status,
      targets: targetsOf(id, payload),
    });

    return { post, replayed: false };
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
            ? `https://example.social/@studio/${target.id}`
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

// What a post would be on one channel, counted as its platform counts it.
const previewOn = (
  channel: Channel,
  postContent: PostContent,
  options: readonly ChannelOptions[]
): ChannelPreview => {
  const rules = platformRules[channel.platform];

  const text =
    postContent.overrides.find(({ channelId }) => channelId === channel.id)
      ?.text ?? postContent.text;

  return {
    channelId: channel.id,
    hashtags: {
      count: countHashtags(text),
      maximum: rules.maxHashtags ?? null,
    },
    links: { count: countLinks(text), maximum: rules.maxLinks ?? null },
    media: {
      count: postContent.media.length,
      maximum: rules.maxMedia ?? null,
    },
    mentions: {
      count: countMentions(text),
      maximum: rules.maxMentions ?? null,
    },
    platform: channel.platform,
    text,
    textCounts: rules.textLimits.map(({ maximum, unit }) => ({
      length: measureText(text, unit),
      maximum,
      unit,
    })),
    violations: violationsOf([channel.id], postContent, options),
  };
};

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
const rowOf = (cells: ReadonlyMap<ImportColumn, string>): ImportedRow => {
  const cell = (column: ImportColumn) => cells.get(column) ?? "";
  const channelIds = idsIn(cell("channels"));
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
      channelIds: [first, ...others],
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
          onSuccess: (made): ImportRowResult => ({
            _tag: "created",
            ...made,
            row,
          }),
        })
      );

/** The workspace groups and the account's, answered from the studio. */
export const studioGroupsLive = (studio: Studio) =>
  Layer.mergeAll(
    HttpApiBuilder.group(Api, "session", (handlers) =>
      handlers.handleAll({
        me: () => inPerson.pipe(Effect.as(studio.me)),
      })
    ),
    HttpApiBuilder.group(Api, "channels", (handlers) =>
      handlers.handleAll({
        chooseAccounts: () => refusing,
        completeConnect: () => refusing,
        connect: () => refusing,
        disconnect: () => refusing,
        list: ({ params }) =>
          allowed("channel:read").pipe(
            Effect.as(params.workspaceId === studioId ? channels : [])
          ),
        platforms: () => refusing,
        reconnect: () => refusing,
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

            const { posts: all } = yield* Ref.get(studio.state);
            const id = `0190f3a0-0000-7000-8000-${String(all.length + 1).padStart(12, "0")}`;

            yield* record(studio, `create:${id}`);

            return yield* savePost(studio, {
              authorId: userId,
              content: payload.content,
              createdVia: null,
              id,
              outcome: null,
              schedule: null,
              scheduledBy: null,
              scheduledVia: null,
              status: "draft",
              targets: targetsOf(id, payload),
            });
          }),
        discard: ({ params }) =>
          Effect.gen(function* discard() {
            yield* allowed("post:delete");

            const post = yield* findPost(
              studio,
              params.workspaceId,
              params.postId
            );

            if (post.status !== "draft") {
              yield* new PostStatusConflict({ status: post.status });
            }

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

            const read = (yield* importRows(payload.csv)).map(rowOf);
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

            const { post } = yield* makePost(
              studio,
              payload,
              headers["idempotency-key"]
            );

            return yield* afterWaiting(studio, post, query.wait);
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

            yield* record(studio, `update:${post.id}`);

            return yield* savePost(studio, {
              ...post,
              content: payload.content,
              targets: targetsOf(post.id, payload),
            });
          }),
        validate: ({ params, payload }) =>
          Effect.gen(function* validate() {
            yield* allowed("post:read");
            yield* allowed("channel:read");

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            const { when } = payload;
            const { posts: all } = yield* Ref.get(studio.state);

            const validation: Omit<PostValidation, "valid"> = {
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
              duplicates: when === undefined ? [] : duplicatesOf(all, payload),
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
                validation.violations.length === 0,
            };
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
        describe: () => refusing,
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
        usage: () => refusing,
      })
    ),
    HttpApiBuilder.group(Api, "analytics", (handlers) =>
      handlers.handleAll({
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
                          impressions: null,
                          likes: 12,
                          quotes: 1,
                          replies: 3,
                          reposts: 4,
                        },
                        permalink: "https://example.social/@studio/1",
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
                    impressions: null,
                    likes: 12,
                    quotes: 1,
                    replies: 3,
                    reposts: 4,
                  },
                  permalink: "https://example.social/@studio/1",
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

            if (!invitations.some(({ id }) => id === params.invitationId)) {
              yield* new InvitationNotFound();
            }

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
      })
    ),
    HttpApiBuilder.group(Api, "connectedApps", (handlers) =>
      handlers.handleAll({
        list: () => Effect.succeed([cli]),
        revoke: () => refusing,
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
              createdAt: now,
              description: payload.description ?? "",
              disabledAt: enabled ? null : now,
              disabledReason: enabled ? null : "manual",
              enabled,
              eventTypes: payload.eventTypes,
              failingSince: null,
              id: `0190f3a0-0000-7000-8000-00000000b${String(current.webhooks.length + 1).padStart(3, "0")}`,
              previousSecretExpiresAt: null,
              updatedAt: now,
              url: payload.url,
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

            const listed = all
              .filter(({ endpointId }) => endpointId === endpoint.id)
              .map(({ delivery }) => delivery);

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

            const again = yield* deliverTo(studio, endpoint, {
              id: past.delivery.eventId,
              type: past.delivery.eventType,
            });

            yield* record(studio, `webhook:redeliver:${past.delivery.id}`);

            return again;
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
        sendTest: ({ params }) =>
          Effect.gen(function* sendTest() {
            yield* allowed("webhook:manage");

            const endpoint = yield* findEndpoint(
              studio,
              params.workspaceId,
              params.endpointId
            );

            const delivery = yield* deliverTo(studio, endpoint, {
              id: "0190f3a0-0000-7000-8000-00000000ee99",
              type: "webhook.test",
            });

            yield* record(studio, `webhook:test:${endpoint.id}`);

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

            return yield* saveEndpoint(studio, {
              ...found,
              ...payload,
              disabledAt: enabled ? null : (found.disabledAt ?? now),
              disabledReason: enabled
                ? null
                : (found.disabledReason ?? "manual"),
              enabled,
              failingSince:
                enabled && !found.enabled ? null : found.failingSince,
              updatedAt: now,
            });
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
