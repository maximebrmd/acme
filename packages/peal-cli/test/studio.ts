import { DateTime, Effect, Layer, Option, Ref } from "effect";
import { HttpRouter } from "effect/http";
import { HttpApiBuilder, HttpApiSchema } from "effect/http-api";
import {
  AlreadyMember,
  Api,
  ChannelNotFound,
  CurrentMember,
  CurrentPrincipal,
  Forbidden,
  InvitationNotFound,
  maxWebhookEndpoints,
  PostNotFound,
  PostStatusConflict,
  TargetStatusConflict,
  TooManyWebhookEndpoints,
  Unauthenticated,
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
  Billing,
  Channel,
  ConnectedApp,
  Invitation,
  Me,
  Permission,
  Post,
  PostDraft,
  PostTarget,
  TikTokAccount,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEventType,
  WebhookUrlRefusal,
} from "peal-contract";

// A synthetic Peal instance's data, in memory, for the commands that act in
// a workspace: two workspaces, their channels, posts, members and
// invitations, and the account's own data. Handlers check the member's
// permissions as the server does, and record the changes they make.

const at = (iso: string) => DateTime.makeUnsafe(iso);

export const studioId = "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60";

export const shopId = "6c1d7f75-6e1a-4b8f-8b63-4a2d3e5f6071";

export const userId = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const everything: readonly Permission[] = [
  "analytics:read",
  "billing:read",
  "channel:read",
  "invitation:create",
  "invitation:cancel",
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
    id: draftId,
    outcome: null,
    schedule: null,
    status: "draft",
    targets: [pendingOn("0190f3a0-0000-7000-8000-00000000e010", mastodonId)],
  },
  {
    authorId: userId,
    content: content("A synthetic post that goes out next week."),
    id: scheduledId,
    outcome: null,
    schedule: { at: at("2026-11-20T09:00:00Z"), timeZone: "Europe/Paris" },
    status: "scheduled",
    targets: [pendingOn("0190f3a0-0000-7000-8000-00000000e011", mastodonId)],
  },
  {
    authorId: userId,
    content: content("A synthetic post that went out yesterday."),
    id: finishedId,
    outcome: "failed",
    schedule: { at: at("2026-11-08T09:00:00Z"), timeZone: "Europe/Paris" },
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

const invitation: Invitation = {
  createdAt: at("2026-11-01T10:00:00Z"),
  email: "guest@example.test",
  expiresAt: at("2026-11-08T10:00:00Z"),
  id: "0190f3a0-0000-7000-8000-00000000a001",
  inviterId: userId,
  role: "editor",
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
  authoredPosts: [],
  connectedApps: [cli],
  contracts: { orders: [], withdrawals: [] },
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
  readonly invitations: readonly Invitation[];
  readonly posts: readonly Post[];
  /** Whether the server has the keys that encrypt signing secrets. */
  readonly signingKeys: boolean;
  readonly webhooks: readonly WebhookEndpoint[];
}

export interface Studio {
  readonly me: Me;
  readonly state: Ref.Ref<StudioState>;
  /** What happens while the server answers an export, as a test sets it. */
  readonly whileExporting: Ref.Ref<Effect.Effect<void>>;
}

export const makeStudio = (me: Me = studioMe) =>
  Effect.all({
    state: Ref.make<StudioState>({
      changes: [],
      deliveries,
      invitations: [invitation],
      posts,
      signingKeys: true,
      webhooks,
    }),
    whileExporting: Ref.make<Effect.Effect<void>>(Effect.void),
  }).pipe(Effect.map((refs): Studio => ({ me, ...refs })));

const record = (studio: Studio, change: string) =>
  Ref.update(studio.state, (current) => ({
    ...current,
    changes: [...current.changes, change],
  }));

// The member a request acts as, if they may do this.
const allowed = (permission: Permission) =>
  CurrentMember.pipe(
    Effect.flatMap((member) =>
      member.permissions.includes(permission)
        ? Effect.succeed(member)
        : Effect.fail(new Forbidden())
    )
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

/** The workspace groups and the account's, answered from the studio. */
export const studioGroupsLive = (studio: Studio) =>
  Layer.mergeAll(
    HttpApiBuilder.group(Api, "session", (handlers) =>
      handlers.handleAll({ me: () => Effect.succeed(studio.me) })
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
        attempts: () => refusing,
        cancel: () => refusing,
        confirm: ({ params, payload }) =>
          allowed("post:schedule").pipe(
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
              id,
              outcome: null,
              schedule: null,
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
        list: () => refusing,
        repost: ({ params }) =>
          allowed("post:schedule").pipe(
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
        reschedule: () => refusing,
        schedule: () => refusing,
        unschedule: ({ params }) =>
          Effect.gen(function* unschedule() {
            yield* allowed("post:schedule");

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
      })
    ),
    HttpApiBuilder.group(Api, "members", (handlers) =>
      handlers.handleAll({
        list: () =>
          Effect.succeed([
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
          ]),
      })
    ),
    HttpApiBuilder.group(Api, "invitations", (handlers) =>
      handlers.handleAll({
        create: ({ payload }) =>
          Effect.gen(function* create() {
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
          allowed("invitation:create").pipe(
            Effect.andThen(Ref.get(studio.state)),
            Effect.map(({ invitations }) => invitations)
          ),
        revoke: ({ params }) =>
          Effect.gen(function* revoke() {
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
