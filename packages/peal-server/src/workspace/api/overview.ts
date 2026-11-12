import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentPrincipal,
  defaultAgendaPageSize,
  InvalidTimeRange,
  maxOverviewPageSize,
  Unauthenticated,
} from "peal-contract";
import type {
  AgendaItem,
  WorkspaceOverview as OverviewView,
} from "peal-contract";

import { forbidden, personRequired } from "#shared/api/forbidden.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { Overview } from "#workspace/application/overview.ts";
import type {
  AgendaItem as Agended,
  WorkspaceOverview,
} from "#workspace/application/overview.ts";

import { userPrincipalOf } from "./principal.ts";

const decodeWorkspaceIds = Schema.decodeUnknownEffect(
  Schema.Array(WorkspaceIdSchema)
);

const overviewView = ({
  channels,
  inbox,
  overPlan,
  posts,
  refused,
  workspace,
}: WorkspaceOverview): OverviewView => ({
  channels: Option.getOrNull(channels),
  id: workspace.id,
  inbox: Option.getOrNull(inbox),
  name: workspace.name,
  overPlan: Option.getOrNull(overPlan),
  posts: Option.getOrNull(posts),
  refused: Option.getOrNull(refused),
  role: workspace.role,
  slug: workspace.slug,
});

const agendaView = ({ platforms, ...item }: Agended): AgendaItem => ({
  ...item,
  platforms: platforms.pipe(
    Option.map((listed) => [...listed]),
    Option.getOrNull
  ),
});

// Who reads across workspaces: a user, never a key, which belongs to a
// workspace and not to anyone.
const currentPerson = Effect.gen(function* currentPerson() {
  const principal = yield* CurrentPrincipal;

  return principal._tag === "user"
    ? userPrincipalOf(principal)
    : yield* personRequired();
});

const refusals = {
  BannedUser: forbidden,
  DatabaseError: Effect.die,
  DirectoryUnavailable: Effect.die,
  InvalidOverviewCursor: () => Effect.fail(new HttpApiError.BadRequest()),
  NotSignedIn: () => Effect.fail(new Unauthenticated()),
  PersonRequired: forbidden,
} as const;

// The workspaces a comma-separated list names; any id that cannot be a
// workspace's is a bad request.
const workspaceIdsFrom = (written: string | undefined) =>
  written === undefined
    ? Effect.succeedNone
    : decodeWorkspaceIds(
        written
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id !== "")
      ).pipe(
        Effect.asSome,
        Effect.mapError(() => new HttpApiError.BadRequest())
      );

export const OverviewHandlers = HttpApiBuilder.group(
  Api,
  "overview",
  Effect.fn(function* overviewHandlers(handlers) {
    const overview = yield* Overview;

    return handlers.handleAll({
      agenda: ({ query }) =>
        Effect.gen(function* agenda() {
          const person = yield* currentPerson;
          const workspaceIds = yield* workspaceIdsFrom(query.workspaceIds);

          const page = yield* overview
            .agenda(person, {
              cursor: Option.fromUndefinedOr(query.cursor),
              from: query.from,
              limit: query.limit ?? defaultAgendaPageSize,
              to: query.to,
              workspaceIds,
            })
            .pipe(
              Effect.catchTags({
                ...refusals,
                InvalidAgendaRange: () => Effect.fail(new InvalidTimeRange()),
              })
            );

          return {
            items: page.items.map(agendaView),
            nextCursor: Option.getOrNull(page.next),
          };
        }),
      get: ({ query }) =>
        Effect.gen(function* get() {
          const person = yield* currentPerson;

          const page = yield* overview
            .page(person, {
              cursor: Option.fromUndefinedOr(query.cursor),
              limit: query.limit ?? maxOverviewPageSize,
            })
            .pipe(Effect.catchTags(refusals));

          return {
            generatedAt: page.generatedAt,
            nextCursor: Option.getOrNull(page.next),
            workspaces: page.workspaces.map(overviewView),
          };
        }),
    });
  })
);
