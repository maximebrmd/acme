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
  IdempotencyKeyReused,
  InvalidTimeZone,
  InvitationNotFound,
  MediaNotFound,
  MediaSourceNotPublic,
  MediaSourceUnreachable,
  MediaTooLarge,
  PostContentInvalid,
  PostNotFound,
  PostStatusConflict,
  ScheduleInPast,
  TargetStatusConflict,
  Unauthenticated,
  UnknownChannels,
  UnknownMedia,
  UnsupportedMediaType,
  UploadIncomplete,
  WorkspaceAccess,
  WorkspaceNotFound,
} from "peal-contract";
import type {
  AccountExport,
  Billing,
  Channel,
  ChannelOptions,
  ConnectedApp,
  ContentViolation,
  Invitation,
  Me,
  Media,
  MediaContentType,
  Permission,
  Post,
  PostContent,
  PostDraft,
  PostOrigin,
  PostTarget,
  SignedRequest,
  Standing,
  TikTokAccount,
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
  "media:read",
  "media:upload",
  "media:delete",
  "post:read",
  "post:create",
  "post:update",
  "post:delete",
  "post:schedule",
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

/** What the instance holds, and what the commands changed. */
export interface StudioState {
  readonly changes: readonly string[];
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
      invitations: [invitation],
      overPlan: false,
      media: [image(readyMediaId, { altText: "A synthetic catalogue cover" })],
      posts,
      sent: {},
      storeStatus: 200,
      stored: [],
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
        list: () => refusing,
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
        send: ({ headers, params, payload }) =>
          Effect.gen(function* send() {
            yield* publishing;

            if (params.workspaceId !== studioId) {
              return yield* new Forbidden();
            }

            const key = headers["idempotency-key"];
            const body = JSON.stringify(payload);
            const before = yield* Ref.get(studio.state);
            const first = key === undefined ? undefined : before.sent[key];

            // The same key answers the post its first request made, as it
            // now stands, and makes no other.
            if (first !== undefined) {
              return first.body === body
                ? yield* findPost(studio, params.workspaceId, first.postId)
                : yield* new IdempotencyKeyReused();
            }

            yield* checkChannels(payload.channelIds);
            yield* checkMedia(studio, payload.content);

            const when =
              payload.when._tag === "now"
                ? { at: studioNow, timeZone: payload.when.timeZone ?? "UTC" }
                : { at: payload.when.at, timeZone: payload.when.timeZone };

            const status = yield* checkTime(when.at, when.timeZone);

            yield* checkContent(
              payload.channelIds,
              payload.content,
              payload.options ?? []
            );

            const id = nextId("d", before.posts.length);

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              sent:
                key === undefined
                  ? current.sent
                  : { ...current.sent, [key]: { body, postId: id } },
            }));
            yield* record(
              studio,
              `send:${id}:${payload.when._tag}:${key ?? "no key"}`
            );

            return yield* savePost(studio, {
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
        get: () => refusing,
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
