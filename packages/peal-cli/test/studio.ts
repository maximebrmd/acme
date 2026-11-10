import { DateTime, Effect, Layer, Option, Ref } from "effect";
import { HttpRouter } from "effect/http";
import { HttpApiBuilder, HttpApiSchema } from "effect/http-api";
import {
  AlreadyMember,
  Api,
  ApprovalNotPending,
  ChannelNotFound,
  CurrentMember,
  CurrentPrincipal,
  Forbidden,
  InvitationNotFound,
  LookupInputInvalid,
  LookupNotFound,
  PostNotFound,
  PostStatusConflict,
  ReviewLinkNotFound,
  TargetStatusConflict,
  Unauthenticated,
  WorkspaceAccess,
  WorkspaceNotFound,
} from "peal-contract";
import type {
  AccountExport,
  ApprovalPolicy,
  ApprovalRequest,
  Billing,
  Channel,
  ConnectedApp,
  Invitation,
  Me,
  Permission,
  Post,
  PostDraft,
  PostTarget,
  ReviewComment,
  ReviewLink,
  TikTokAccount,
} from "peal-contract";

import {
  capabilitiesOn,
  describedPlatforms,
  pinterestLookup,
  playlistPage,
  videoCategories,
} from "./studio-capabilities.ts";

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
  "organization:update",
  "post:approve",
  "post:read",
  "post:create",
  "post:update",
  "post:delete",
  "post:schedule",
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

export const pinterestId = "0190f3a0-0000-7000-8000-00000000c006";

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
  {
    avatarUrl: null,
    connection: null,
    displayName: "Studio",
    handle: "@studioexample",
    id: pinterestId,
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
  failureReason: null,
  id,
  options: null,
  permalink: null,
  publishedAt: null,
  round: 1,
  status: "pending",
  unconfirmedReason: null,
});

const escape = String.fromCodePoint(0x1b);

const contributorId = "8d0f7780-8536-41ef-a55c-f18fd2a01bf8";

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
    authorId: contributorId,
    content: content("A synthetic post that waits. Out on Friday."),
    id: awaitingId,
    outcome: null,
    schedule: { at: at("2026-11-21T09:00:00Z"), timeZone: "Europe/Paris" },
    status: "awaitingApproval",
    targets: [pendingOn("0190f3a0-0000-7000-8000-00000000e012", mastodonId)],
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

// The approval that waits for the post a contributor asked to send.
const approval: ApprovalRequest = {
  decision: null,
  id: "0190f3a0-0000-7000-8000-00000000b001",
  postId: awaitingId,
  requestedAt: at("2026-11-09T10:00:00Z"),
  requestedBy: contributorId,
  requestedByName: "Synthetic Contributor",
  requestedVia: "member",
  schedule: { at: at("2026-11-21T09:00:00Z"), timeZone: "Europe/Paris" },
  status: "pending",
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
      postReview: true,
      postUnconfirmed: true,
    },
    everyPost: false,
  },
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
    updatedAt: at("2026-10-01T08:00:00Z"),
  },
  workspaces: [],
});

/** What the instance holds, and what the commands changed. */
export interface StudioState {
  readonly approvals: readonly ApprovalRequest[];
  readonly changes: readonly string[];
  readonly comments: readonly ReviewComment[];
  readonly invitations: readonly Invitation[];
  readonly links: readonly ReviewLink[];
  readonly policy: ApprovalPolicy;
  readonly posts: readonly Post[];
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
      approvals: [approval],
      changes: [],
      comments: [comment],
      invitations: [invitation],
      links: [],
      policy: "contributorsAndApplications",
      posts,
    }),
    whileExporting: Ref.make<Effect.Effect<void>>(Effect.void),
  }).pipe(Effect.map((refs): Studio => ({ me, ...refs })));

const record = (studio: Studio, change: string) =>
  Ref.update(studio.state, (current) => ({
    ...current,
    changes: [...current.changes, change],
  }));

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
        approve: ({ params }) =>
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
            yield* findPost(studio, params.workspaceId, params.postId);

            const { approvals, comments } = yield* Ref.get(studio.state);

            return {
              approvals: approvals.filter(
                ({ postId }) => postId === params.postId
              ),
              comments: comments.filter(
                ({ postId }) => postId === params.postId
              ),
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
