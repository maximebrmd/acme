import { Context, DateTime, Duration, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { AuditEvent } from "#staff/domain/audit-event.ts";
import { banHolds } from "#staff/domain/ban-term.ts";

import { AuditLog } from "./ports/audit-log.ts";
import { StaffDirectory } from "./ports/staff-directory.ts";
import type {
  Person,
  Slice,
  UserProfile,
  UserSummary,
  WorkspaceProfile,
  WorkspaceSummary,
} from "./ports/staff-directory.ts";
import { SystemHealth } from "./ports/system-health.ts";
import type { DuePost } from "./ports/system-health.ts";
import { WorkspaceHealth } from "./ports/workspace-health.ts";
import type {
  ChannelHealth,
  PostCounts,
  PostTrouble,
  WorkspaceBilling,
  WebhookHealth,
} from "./ports/workspace-health.ts";
import { UserNotFound } from "./user-not-found.ts";
import { WorkspaceNotFound } from "./workspace-not-found.ts";

/** How many rows a page of the console's lists holds. */
export const pageSize = 25;

/** How many of a workspace's latest troubles the console shows. */
export const troublesShown = 20;

/** How far ahead the system page looks for posts due. */
export const dueWindow = Duration.hours(1);

/** How late a scheduled post may start before it counts as overdue. */
export const overdueAfter = Duration.minutes(5);

/** How many of the due posts, and of the channels to reconnect, are listed. */
export const systemListed = 20;

/** One page of a list, from 1. */
export interface Page<A> extends Slice<A> {
  readonly page: number;
  readonly pageSize: number;
}

/** A workspace as staff see it: its people and its health. */
export interface WorkspaceOverview extends WorkspaceProfile {
  readonly billing: WorkspaceBilling;
  readonly channels: readonly ChannelHealth[];
  readonly posts: PostCounts;
  /** With the platform of each, while its channel is connected. */
  readonly troubles: readonly (PostTrouble & {
    readonly platform: Option.Option<ChannelHealth["platform"]>;
  })[];
  readonly webhooks: readonly WebhookHealth[];
}

/** The server's health. */
export interface SystemOverview {
  readonly checkedAt: DateTime.Utc;
  readonly due: { readonly posts: readonly DuePost[]; readonly total: number };
  readonly failingChannels: readonly ChannelHealth[];
  readonly overdue: number;
  readonly ready: boolean;
  readonly release: Option.Option<string>;
}

/** An audit event, with who its ids name while they exist. */
export interface AuditEntry {
  readonly event: AuditEvent;
  readonly staff: Option.Option<Person>;
  readonly target: Option.Option<Person>;
}

const sliceOf = (page: number) => ({
  limit: pageSize,
  offset: (Math.max(page, 1) - 1) * pageSize,
});

const pageOf =
  (page: number) =>
  <A>(slice: Slice<A>): Page<A> => ({
    ...slice,
    page: Math.max(page, 1),
    pageSize,
  });

// A ban past its end is over, though Better Auth lifts it only at the
// account's next sign-in.
const withHoldingBan =
  (now: DateTime.Utc) =>
  <A extends UserSummary>(user: A): A => ({
    ...user,
    ban: user.ban.pipe(
      Option.filter(({ expiresAt }) => banHolds(expiresAt, now))
    ),
  });

const trimmed = (query: Option.Option<string>): Option.Option<string> =>
  query.pipe(
    Option.map((text) => text.trim()),
    Option.filter((text) => text !== "")
  );

/**
 * What the staff console reads: accounts, workspaces, the system's health
 * and the audit log. Metadata only: who, when, where and how many, never a
 * post's text or media, which staff see only by impersonating. Its callers
 * are staff, which the API's StaffAccess checked.
 */
export class StaffConsole extends Context.Service<
  StaffConsole,
  {
    /** The staff member themselves. */
    readonly staff: (
      staffId: UserId
    ) => Effect.Effect<Person, DatabaseError | UserNotFound>;
    readonly users: (request: {
      readonly page: number;
      readonly query: Option.Option<string>;
    }) => Effect.Effect<Page<UserSummary>, DatabaseError>;
    readonly user: (
      userId: UserId
    ) => Effect.Effect<UserProfile, DatabaseError | UserNotFound>;
    readonly workspaces: (request: {
      readonly page: number;
      readonly query: Option.Option<string>;
    }) => Effect.Effect<Page<WorkspaceSummary>, DatabaseError>;
    readonly workspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<WorkspaceOverview, DatabaseError | WorkspaceNotFound>;
    readonly system: Effect.Effect<SystemOverview, DatabaseError>;
    readonly audit: (request: {
      readonly page: number;
      readonly targetId: Option.Option<UserId>;
    }) => Effect.Effect<Page<AuditEntry>, DatabaseError>;
  }
>()("peal-server/staff/application/StaffConsole") {
  static readonly layer = Layer.effect(
    StaffConsole,
    Effect.gen(function* StaffConsoleLive() {
      const directory = yield* StaffDirectory;
      const health = yield* WorkspaceHealth;
      const system = yield* SystemHealth;
      const log = yield* AuditLog;

      const staff = Effect.fn("StaffConsole.staff")(function* staff(
        staffId: UserId
      ) {
        const [found] = yield* directory.people([staffId]);

        if (found === undefined) {
          return yield* new UserNotFound({ userId: staffId });
        }

        return found;
      });

      const users = Effect.fn("StaffConsole.users")(function* users({
        page,
        query,
      }: {
        readonly page: number;
        readonly query: Option.Option<string>;
      }) {
        const now = yield* DateTime.now;

        return yield* directory
          .users({ ...sliceOf(page), query: trimmed(query) })
          .pipe(
            Effect.map((slice) =>
              pageOf(page)({
                ...slice,
                items: slice.items.map(withHoldingBan(now)),
              })
            )
          );
      });

      const user = Effect.fn("StaffConsole.user")(function* user(
        userId: UserId
      ) {
        const now = yield* DateTime.now;
        const found = yield* directory.user(userId, now);

        if (Option.isNone(found)) {
          return yield* new UserNotFound({ userId });
        }

        return withHoldingBan(now)(found.value);
      });

      const workspaces = Effect.fn("StaffConsole.workspaces")(
        function* workspaces({
          page,
          query,
        }: {
          readonly page: number;
          readonly query: Option.Option<string>;
        }) {
          return yield* directory
            .workspaces({ ...sliceOf(page), query: trimmed(query) })
            .pipe(Effect.map(pageOf(page)));
        }
      );

      const workspace = Effect.fn("StaffConsole.workspace")(function* workspace(
        workspaceId: WorkspaceId
      ) {
        const found = yield* directory.workspace(workspaceId);

        if (Option.isNone(found)) {
          return yield* new WorkspaceNotFound({ workspaceId });
        }

        const { billing, channels, posts, troubles, webhooks } =
          yield* Effect.all(
            {
              billing: health.billing(workspaceId),
              channels: health.channels(workspaceId),
              posts: health.posts(workspaceId),
              troubles: health.troubles(workspaceId, troublesShown),
              webhooks: health.webhooks(workspaceId),
            },
            { concurrency: "unbounded" }
          );

        const overview: WorkspaceOverview = {
          ...found.value,
          billing,
          channels,
          posts,
          troubles: troubles.map((trouble) => ({
            ...trouble,
            platform: Option.fromNullishOr(
              channels.find(({ id }) => id === trouble.channelId)
            ).pipe(Option.map(({ platform }) => platform)),
          })),
          webhooks,
        };

        return overview;
      });

      const systemOverview = Effect.gen(function* systemOverview() {
        const now = yield* DateTime.now;

        const { due, failingChannels, overdue, ready } = yield* Effect.all(
          {
            due: system.due({
              from: now,
              limit: systemListed,
              to: DateTime.addDuration(now, dueWindow),
            }),
            failingChannels: system.failingChannels(systemListed),
            overdue: system.overdue(
              DateTime.subtractDuration(now, overdueAfter)
            ),
            ready: system.ready,
          },
          { concurrency: "unbounded" }
        );

        const overview: SystemOverview = {
          checkedAt: now,
          due,
          failingChannels,
          overdue,
          ready,
          release: system.release,
        };

        return overview;
      }).pipe(Effect.withSpan("StaffConsole.system"));

      const audit = Effect.fn("StaffConsole.audit")(function* audit({
        page,
        targetId,
      }: {
        readonly page: number;
        readonly targetId: Option.Option<UserId>;
      }) {
        const slice = yield* log.read({ ...sliceOf(page), targetId });

        const ids = [
          ...new Set(
            slice.items.flatMap(({ staffId, targetId: target }) => [
              ...Option.toArray(staffId),
              ...Option.toArray(target),
            ])
          ),
        ];

        const people = yield* directory.people(ids);

        const personOf = (id: Option.Option<UserId>) =>
          id.pipe(
            Option.flatMap((userId) =>
              Option.fromNullishOr(
                people.find((person) => person.id === userId)
              )
            )
          );

        return pageOf(page)({
          items: slice.items.map((event) => ({
            event,
            staff: personOf(event.staffId),
            target: personOf(event.targetId),
          })),
          total: slice.total,
        });
      });

      return StaffConsole.of({
        audit,
        staff,
        system: systemOverview,
        user,
        users,
        workspace,
        workspaces,
      });
    })
  );
}
