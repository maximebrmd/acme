import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Schema,
} from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type { WorkspaceMembership } from "#workspace/domain/account.ts";
import { isBanned } from "#workspace/domain/ban.ts";
import { BannedUser } from "#workspace/domain/banned-user.ts";
import { answerAccessDenied } from "#workspace/domain/membership.ts";
import {
  overviewReader,
  sectionsFor,
  workspacePage,
  WorkspacePositionSchema,
} from "#workspace/domain/overview.ts";
import type { OverviewSections } from "#workspace/domain/overview.ts";
import type { PersonRequired } from "#workspace/domain/person-required.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import { InvalidAgendaRange } from "./invalid-agenda-range.ts";
import { InvalidOverviewCursor } from "./invalid-overview-cursor.ts";
import { MemberDirectory } from "./member-directory.ts";
import { NotSignedIn } from "./not-signed-in.ts";
import { OverviewSources } from "./overview-sources.ts";
import type {
  AgendaPosition,
  AgendaStatus,
  ChannelStates,
  PostAttention,
} from "./overview-sources.ts";
import { ResolveMember } from "./resolve-member.ts";

/** The most workspaces a page of the overview holds. */
export const maxOverviewPageSize = 50;

/** The most posts a page of the agenda holds. */
export const maxAgendaPageSize = 100;

/** The longest range the agenda lists. */
export const maxAgendaRange = Duration.days(31);

// How many workspaces are resolved, or asked their standing, at once: each
// is a query or two, on a pool the rest of the server shares.
const concurrency = 8;

/** Why a workspace shows no figure: it refuses the person as they stand. */
export type Refusal = "twoStepRequired";

/** What needs attention in one workspace, as far as the person may read. */
export interface WorkspaceOverview {
  /** None where the member may not read channels. */
  readonly channels: Option.Option<ChannelStates>;
  /** None where the member may not read the comments. */
  readonly inbox: Option.Option<{ readonly unanswered: number }>;
  /** None where the workspace refuses the person. */
  readonly overPlan: Option.Option<boolean>;
  /** None where the member may not read posts. */
  readonly posts: Option.Option<
    PostAttention & { readonly mayApprove: boolean }
  >;
  readonly refused: Option.Option<Refusal>;
  readonly workspace: WorkspaceMembership;
}

/** A page of the person's workspaces, and the cursor of the next. */
export interface OverviewPage {
  readonly generatedAt: DateTime.Utc;
  readonly next: Option.Option<string>;
  readonly workspaces: readonly WorkspaceOverview[];
}

/** One post of the agenda, as the person may read it. */
export interface AgendaItem {
  readonly excerpt: string;
  /** None where the member may not read channels. */
  readonly platforms: Option.Option<readonly Platform[]>;
  readonly postId: PostId;
  readonly scheduledAt: DateTime.Utc;
  readonly status: AgendaStatus;
  readonly timeZone: string;
  readonly workspaceId: WorkspaceId;
}

export interface AgendaPage {
  readonly items: readonly AgendaItem[];
  readonly next: Option.Option<string>;
}

export interface OverviewPageRequest {
  readonly cursor: Option.Option<string>;
  readonly limit: number;
}

export interface AgendaPageRequest extends OverviewPageRequest {
  /** Included. */
  readonly from: DateTime.Utc;
  /** Excluded. */
  readonly to: DateTime.Utc;
  /** Only these of the person's workspaces; all of them when none. */
  readonly workspaceIds: Option.Option<readonly WorkspaceId[]>;
}

type Failure =
  | BannedUser
  | DatabaseError
  | DirectoryUnavailable
  | InvalidOverviewCursor
  | NotSignedIn
  | PersonRequired;

// Cursors are positions, written so that clients keep them as they are.
const WorkspaceCursorSchema = Schema.StringFromBase64Url.pipe(
  Schema.decodeTo(Schema.fromJsonString(WorkspacePositionSchema))
);

const AgendaCursorSchema = Schema.StringFromBase64Url.pipe(
  Schema.decodeTo(
    Schema.fromJsonString(
      Schema.Struct({
        postId: PostIdSchema,
        scheduledAt: Schema.DateTimeUtcFromMillis,
      })
    )
  )
);

const decodeWith =
  <A>(schema: Schema.Codec<A, string>) =>
  (cursor: Option.Option<string>) =>
    Option.match(cursor, {
      onNone: () => Effect.succeedNone,
      onSome: (written) =>
        Schema.decodeUnknownEffect(schema)(written).pipe(
          Effect.asSome,
          Effect.mapError(() => new InvalidOverviewCursor())
        ),
    });

const decodeWorkspaceCursor = decodeWith(WorkspaceCursorSchema);
const decodeAgendaCursor = decodeWith(AgendaCursorSchema);
const encodeWorkspaceCursor = Schema.encodeEffect(WorkspaceCursorSchema);
const encodeAgendaCursor = Schema.encodeEffect(AgendaCursorSchema);

/** How the person stands in one workspace: an actor, or why not. */
type Standing =
  | { readonly _tag: "member"; readonly actor: Actor }
  | { readonly _tag: "refused"; readonly refusal: Refusal }
  | { readonly _tag: "gone" };

type Resolved = WorkspaceMembership & { readonly standing: Standing };

const actorsOf = (resolved: readonly Resolved[]) =>
  resolved.flatMap(({ standing }) =>
    standing._tag === "member" ? [standing.actor] : []
  );

const idsWhere = (
  actors: readonly Actor[],
  section: keyof OverviewSections
): readonly WorkspaceId[] =>
  actors.flatMap((actor) =>
    sectionsFor(actor)[section] ? [actor.workspaceId] : []
  );

const figureOf = <A>(
  readable: boolean,
  found: ReadonlyMap<WorkspaceId, A>,
  workspaceId: WorkspaceId,
  nothing: A
): Option.Option<A> =>
  readable ? Option.some(found.get(workspaceId) ?? nothing) : Option.none();

// A source is not asked about no workspace.
const ask = <A>(
  ids: readonly WorkspaceId[],
  read: (
    ids: readonly WorkspaceId[]
  ) => Effect.Effect<ReadonlyMap<WorkspaceId, A>, DatabaseError>
) =>
  ids.length === 0
    ? Effect.succeed<ReadonlyMap<WorkspaceId, A>>(new Map())
    : read(ids);

const noPosts: PostAttention = {
  awaitingApproval: 0,
  failedLast7Days: 0,
  scheduledNext7Days: 0,
  unconfirmedLast7Days: 0,
};

const noChannels: ChannelStates = { connected: 0, off: 0, toReconnect: 0 };

/**
 * What a person reads across the workspaces they belong to: what needs
 * attention in each, and one agenda of what goes out. Each workspace is
 * decided through `ResolveMember`, as every request into it is, so a ban,
 * a removal, two-step verification it requires, staff impersonating the
 * person and an application's scopes hold here as they do on its pages:
 * a workspace that refuses the person shows its name and no figure, and
 * each figure is read only where the member holds the permission its own
 * page checks, missing (never zero) where they do not.
 */
export class Overview extends Context.Service<
  Overview,
  {
    readonly page: (
      principal: UserPrincipal,
      request: OverviewPageRequest
    ) => Effect.Effect<OverviewPage, Failure>;
    readonly agenda: (
      principal: UserPrincipal,
      request: AgendaPageRequest
    ) => Effect.Effect<AgendaPage, Failure | InvalidAgendaRange>;
  }
>()("peal-server/workspace/application/Overview") {
  static readonly layer = Layer.effect(
    Overview,
    Effect.gen(function* OverviewLive() {
      const directory = yield* MemberDirectory;
      const members = yield* ResolveMember;
      const sources = yield* OverviewSources;

      // The person's workspaces, once their account is read: none for an
      // account that is gone, a refusal for one staff banned.
      const workspacesOf = Effect.fn("Overview.workspacesOf")(
        function* workspacesOf(principal: UserPrincipal) {
          const reader = yield* Effect.fromResult(overviewReader(principal));
          const found = yield* directory.account(reader.userId);

          if (Option.isNone(found)) {
            return yield* new NotSignedIn();
          }

          if (isBanned(found.value.ban, yield* DateTime.now)) {
            return yield* new BannedUser({ userId: found.value.id });
          }

          return found.value.workspaces;
        }
      );

      const standingIn = (principal: UserPrincipal, workspaceId: WorkspaceId) =>
        members.resolve(principal, workspaceId).pipe(
          Effect.map((actor): Standing => ({ _tag: "member", actor })),
          Effect.catchTag(
            [
              "BannedUser",
              "NotAMember",
              "TwoStepRequired",
              "WorkspaceMismatch",
            ],
            answerAccessDenied({
              BannedUser: (banned) => Effect.fail(banned),
              // Left since the account was read, or another workspace than
              // a token's: nothing of it is shown.
              NotAMember: () => Effect.succeed<Standing>({ _tag: "gone" }),
              TwoStepRequired: () =>
                Effect.succeed<Standing>({
                  _tag: "refused",
                  refusal: "twoStepRequired",
                }),
              WorkspaceMismatch: () =>
                Effect.succeed<Standing>({ _tag: "gone" }),
            })
          )
        );

      const resolveAll = (
        principal: UserPrincipal,
        workspaces: readonly WorkspaceMembership[]
      ) =>
        Effect.forEach(
          workspaces,
          (workspace) =>
            standingIn(principal, workspace.id).pipe(
              Effect.map((standing): Resolved => ({ ...workspace, standing }))
            ),
          { concurrency }
        );

      const page = Effect.fn("Overview.page")(function* page(
        principal: UserPrincipal,
        request: OverviewPageRequest
      ) {
        const after = yield* decodeWorkspaceCursor(request.cursor);
        const all = yield* workspacesOf(principal);
        const generatedAt = yield* DateTime.now;
        const listed = workspacePage(all, after, request.limit);
        const resolved = yield* resolveAll(principal, listed.workspaces);
        const actors = actorsOf(resolved);

        const found = yield* Effect.all(
          {
            channels: ask(idsWhere(actors, "channels"), sources.channels),
            overPlan: Effect.forEach(
              actors,
              (actor) =>
                sources
                  .overPlan(actor)
                  .pipe(
                    Effect.map((over) => [actor.workspaceId, over] as const)
                  ),
              { concurrency }
            ).pipe(Effect.map((pairs) => new Map(pairs))),
            posts: ask(idsWhere(actors, "posts"), (ids) =>
              sources.posts(ids, generatedAt)
            ),
            unanswered: ask(idsWhere(actors, "inbox"), sources.unanswered),
          },
          { concurrency: "unbounded" }
        );

        const workspaces = resolved.flatMap(
          ({ standing, ...workspace }): WorkspaceOverview[] => {
            if (standing._tag === "gone") {
              return [];
            }

            if (standing._tag === "refused") {
              return [
                {
                  channels: Option.none(),
                  inbox: Option.none(),
                  overPlan: Option.none(),
                  posts: Option.none(),
                  refused: Option.some(standing.refusal),
                  workspace,
                },
              ];
            }

            const sections = sectionsFor(standing.actor);

            return [
              {
                channels: figureOf(
                  sections.channels,
                  found.channels,
                  workspace.id,
                  noChannels
                ),
                inbox: figureOf(
                  sections.inbox,
                  found.unanswered,
                  workspace.id,
                  0
                ).pipe(Option.map((unanswered) => ({ unanswered }))),
                overPlan: Option.fromUndefinedOr(
                  found.overPlan.get(workspace.id)
                ),
                posts: figureOf(
                  sections.posts,
                  found.posts,
                  workspace.id,
                  noPosts
                ).pipe(
                  Option.map((posts) => ({
                    ...posts,
                    mayApprove: sections.mayApprove,
                  }))
                ),
                refused: Option.none(),
                workspace,
              },
            ];
          }
        );

        const next = yield* Option.match(listed.next, {
          onNone: () => Effect.succeedNone,
          onSome: (position) =>
            encodeWorkspaceCursor(position).pipe(Effect.orDie, Effect.asSome),
        });

        const overview: OverviewPage = { generatedAt, next, workspaces };

        return overview;
      });

      const agenda = Effect.fn("Overview.agenda")(function* agenda(
        principal: UserPrincipal,
        request: AgendaPageRequest
      ) {
        const span = DateTime.distance(request.from, request.to);

        if (
          !DateTime.isLessThan(request.from, request.to) ||
          Duration.isGreaterThan(span, maxAgendaRange)
        ) {
          return yield* new InvalidAgendaRange();
        }

        const after: Option.Option<AgendaPosition> = yield* decodeAgendaCursor(
          request.cursor
        );

        const all = yield* workspacesOf(principal);

        const asked = Option.match(request.workspaceIds, {
          onNone: () => all,
          onSome: (ids) => all.filter(({ id }) => ids.includes(id)),
        });

        const actors = actorsOf(yield* resolveAll(principal, asked));
        const readable = idsWhere(actors, "posts");
        const withChannels = new Set(idsWhere(actors, "channels"));

        if (readable.length === 0) {
          const nothing: AgendaPage = { items: [], next: Option.none() };

          return nothing;
        }

        const entries = yield* sources.agenda({
          after,
          from: request.from,
          // One more, to know whether another page follows.
          limit: request.limit + 1,
          to: request.to,
          workspaceIds: readable,
        });

        const items = entries
          .slice(0, request.limit)
          .map((entry): AgendaItem => ({
            ...entry,
            platforms: withChannels.has(entry.workspaceId)
              ? Option.some(entry.platforms)
              : Option.none(),
          }));

        const last = items.at(-1);

        const next =
          entries.length > request.limit && last !== undefined
            ? yield* encodeAgendaCursor({
                postId: last.postId,
                scheduledAt: last.scheduledAt,
              }).pipe(Effect.orDie, Effect.asSome)
            : Option.none();

        const answered: AgendaPage = { items, next };

        return answered;
      });

      return Overview.of({ agenda, page });
    })
  );
}
