import {
  Api,
  CurrentStaff,
  FailureReasonSchema,
  StaffActionRefused,
  SubscriptionStatusSchema,
  UnconfirmedReasonSchema,
  UserNotFound,
  WorkspaceNotFound,
} from "acme-contract";
import type {
  StaffAuditEvent,
  StaffChannel,
  StaffUser,
  StaffUserSummary,
  StaffWorkspace,
} from "acme-contract";
import { Effect, Option, Redacted, Schema } from "effect";
import {
  Cookies,
  HttpEffect,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { HttpApiBuilder } from "effect/http-api";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import type {
  UserProfile,
  UserSummary,
} from "#staff/application/ports/staff-directory.ts";
import type { ChannelHealth } from "#staff/application/ports/workspace-health.ts";
import { StaffActions } from "#staff/application/staff-actions.ts";
import type { Action } from "#staff/application/staff-actions.ts";
import { pageSize, StaffConsole } from "#staff/application/staff-console.ts";
import type {
  AuditEntry,
  WorkspaceOverview,
} from "#staff/application/staff-console.ts";
import { StaffReasonSchema } from "#staff/domain/staff-reason.ts";

const decodeUserId = Schema.decodeUnknownOption(UserIdSchema);

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

const decodeReason = Schema.decodeUnknownEffect(StaffReasonSchema);

const decodeTroubleReason = Schema.decodeUnknownEffect(
  Schema.Union([FailureReasonSchema, UnconfirmedReasonSchema])
);

const decodeSubscriptionStatus = Schema.decodeUnknownEffect(
  SubscriptionStatusSchema
);

const orNull = Option.getOrNull;

const summaryView = (user: UserSummary): StaffUserSummary => ({
  banned: Option.isSome(user.ban),
  createdAt: user.createdAt,
  email: user.email,
  emailVerified: user.emailVerified,
  id: user.id,
  lastSignInAt: orNull(user.lastSignInAt),
  name: user.name,
  staff: user.staff,
});

const userView = (user: UserProfile): StaffUser => ({
  ban: Option.match(user.ban, {
    onNone: () => null,
    onSome: (ban) => ({
      expiresAt: orNull(ban.expiresAt),
      reason: orNull(ban.reason),
    }),
  }),
  createdAt: user.createdAt,
  email: user.email,
  emailVerified: user.emailVerified,
  id: user.id,
  lastSignInAt: orNull(user.lastSignInAt),
  locale: user.locale,
  name: user.name,
  sessions: user.sessions,
  staff: user.staff,
  workspaces: user.workspaces,
});

const channelView = (channel: ChannelHealth): StaffChannel => ({
  handle: channel.handle,
  id: channel.id,
  platform: channel.platform,
  status: channel.status,
  tokenExpiresAt: orNull(channel.tokenExpiresAt),
  workspaceId: channel.workspaceId,
});

const workspaceView = Effect.fn("StaffWorkspace.view")(function* workspaceView(
  workspace: WorkspaceOverview
) {
  const failures = yield* Effect.all(
    workspace.troubles.map((trouble) =>
      decodeTroubleReason(trouble.reason).pipe(
        Effect.orDie,
        Effect.map((reason) => ({
          at: trouble.at,
          channelId: trouble.channelId,
          code: orNull(trouble.code),
          platform: orNull(trouble.platform),
          postId: trouble.postId,
          reason,
          status: trouble.status,
          targetId: trouble.targetId,
        }))
      )
    )
  );

  const subscription = yield* Option.match(workspace.billing.subscription, {
    onNone: () => Effect.succeed(null),
    onSome: (bought) =>
      decodeSubscriptionStatus(bought.status).pipe(
        Effect.orDie,
        Effect.map((status) => ({
          cancelAtPeriodEnd: bought.cancelAtPeriodEnd,
          currentPeriodEnd: orNull(bought.currentPeriodEnd),
          plan: bought.plan,
          status,
        }))
      ),
  });

  const view: StaffWorkspace = {
    billing: { plan: orNull(workspace.billing.plan), subscription },
    channels: workspace.channels.map(channelView),
    createdAt: workspace.createdAt,
    failures,
    id: workspace.id,
    members: workspace.members,
    name: workspace.name,
    posts: workspace.posts,
    slug: workspace.slug,
  };

  return view;
});

const auditView = ({ event, staff, target }: AuditEntry): StaffAuditEvent => ({
  action: event.action,
  at: event.at,
  banExpiresAt: orNull(event.banExpiresAt),
  id: event.id,
  reason: orNull(event.reason),
  staffEmail: staff.pipe(
    Option.map(({ email }) => email),
    Option.getOrNull
  ),
  staffId: orNull(event.staffId),
  targetEmail: target.pipe(
    Option.map(({ email }) => email),
    Option.getOrNull
  ),
  targetId: orNull(event.targetId),
});

const userNotFound = () => Effect.fail(new UserNotFound());

const refused = ({
  reason,
}: {
  readonly reason: StaffActionRefused["reason"];
}) => Effect.fail(new StaffActionRefused({ reason }));

// The staff member, with the cookies of the session they sent, which Better
// Auth checks again when it carries an action out.
const currentStaff = Effect.gen(function* currentStaff() {
  const { userId } = yield* CurrentStaff;
  const request = yield* HttpServerRequest.HttpServerRequest;

  return {
    session: Redacted.make(request.headers["cookie"] ?? ""),
    userId: UserIdSchema.make(userId),
  };
});

// The account in the path, the staff member and the reason they gave.
const actionOn = Effect.fn("StaffAction.of")(function* actionOn(
  userId: string,
  reason: string
) {
  const target = decodeUserId(userId);

  if (Option.isNone(target)) {
    return yield* new UserNotFound();
  }

  const action: Action = {
    reason: yield* decodeReason(reason).pipe(Effect.orDie),
    staff: yield* currentStaff,
    userId: target.value,
  };

  return action;
});

const failures = {
  ActionRefused: refused,
  DatabaseError: Effect.die,
  ModerationFailed: Effect.die,
  UserNotFound: userNotFound,
} as const;

// Signs the browser in as the account: Better Auth's cookies on the reply.
const withCookies = (setCookies: readonly string[]) =>
  HttpEffect.appendPreResponseHandler((_request, response) =>
    Effect.succeed(
      HttpServerResponse.mergeCookies(
        response,
        Cookies.fromSetCookie(setCookies)
      )
    )
  );

const pageOf = (page: number | undefined): number => page ?? 1;

const queryOf = (query: string | undefined): Option.Option<string> =>
  Option.fromUndefinedOr(query);

export const StaffHandlers = HttpApiBuilder.group(
  Api,
  "staff",
  Effect.fn(function* staffHandlers(handlers) {
    const staffConsole = yield* StaffConsole;
    const actions = yield* StaffActions;

    const viewUser = (userId: UserId) =>
      staffConsole.user(userId).pipe(
        Effect.map(userView),
        Effect.catchTags({
          DatabaseError: Effect.die,
          UserNotFound: userNotFound,
        })
      );

    return handlers.handleAll({
      audit: ({ query }) =>
        Effect.gen(function* audit() {
          const targetId =
            query.targetId === undefined
              ? Option.none<UserId>()
              : decodeUserId(query.targetId);

          // An id that names no account has no event.
          if (query.targetId !== undefined && Option.isNone(targetId)) {
            return { items: [], page: pageOf(query.page), pageSize, total: 0 };
          }

          const page = yield* staffConsole
            .audit({ page: pageOf(query.page), targetId })
            .pipe(Effect.orDie);

          return { ...page, items: page.items.map(auditView) };
        }),
      ban: ({ params, payload }) =>
        Effect.gen(function* ban() {
          const action = yield* actionOn(params.userId, payload.reason);

          yield* actions
            .ban({
              ...action,
              expiresAt: Option.fromNullOr(payload.expiresAt),
            })
            .pipe(Effect.catchTags(failures));
        }),
      impersonate: ({ params, payload }) =>
        Effect.gen(function* impersonate() {
          const action = yield* actionOn(params.userId, payload.reason);

          const setCookies = yield* actions
            .impersonate(action)
            .pipe(Effect.catchTags(failures));

          yield* withCookies(setCookies);
        }),
      resendVerification: ({ params, payload }) =>
        Effect.gen(function* resendVerification() {
          const action = yield* actionOn(params.userId, payload.reason);

          yield* actions
            .resendVerification(action)
            .pipe(Effect.catchTags(failures));
        }),
      revokeSessions: ({ params, payload }) =>
        Effect.gen(function* revokeSessions() {
          const action = yield* actionOn(params.userId, payload.reason);

          yield* actions
            .revokeSessions(action)
            .pipe(Effect.catchTags(failures));
        }),
      session: () =>
        Effect.gen(function* session() {
          const { userId } = yield* currentStaff;

          const staff = yield* staffConsole.staff(userId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              UserNotFound: Effect.die,
            })
          );

          return { email: staff.email, name: staff.name, userId: staff.id };
        }),
      system: () =>
        staffConsole.system.pipe(
          Effect.orDie,
          Effect.map((system) => ({
            checkedAt: system.checkedAt,
            due: {
              posts: system.due.posts,
              total: system.due.total,
            },
            failingChannels: system.failingChannels.map(channelView),
            overdue: system.overdue,
            ready: system.ready,
            release: orNull(system.release),
          }))
        ),
      unban: ({ params, payload }) =>
        Effect.gen(function* unban() {
          const action = yield* actionOn(params.userId, payload.reason);

          yield* actions.unban(action).pipe(Effect.catchTags(failures));
        }),
      user: ({ params }) =>
        Option.match(decodeUserId(params.userId), {
          onNone: userNotFound,
          onSome: viewUser,
        }),
      users: ({ query }) =>
        staffConsole
          .users({ page: pageOf(query.page), query: queryOf(query.query) })
          .pipe(
            Effect.orDie,
            Effect.map((page) => ({
              ...page,
              items: page.items.map(summaryView),
            }))
          ),
      workspace: ({ params }) =>
        Option.match(decodeWorkspaceId(params.workspaceId), {
          onNone: () => Effect.fail(new WorkspaceNotFound()),
          onSome: (workspaceId) =>
            staffConsole.workspace(workspaceId).pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                WorkspaceNotFound: () => Effect.fail(new WorkspaceNotFound()),
              }),
              Effect.flatMap(workspaceView)
            ),
        }),
      workspaces: ({ query }) =>
        staffConsole
          .workspaces({ page: pageOf(query.page), query: queryOf(query.query) })
          .pipe(Effect.orDie),
    });
  })
);
