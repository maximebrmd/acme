import { DateTime, Duration, Effect, Ref } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentPrincipal,
  defaultAgendaPageSize,
  Forbidden,
  InvalidTimeRange,
  maxAgendaDays,
} from "peal-contract";
import type {
  AgendaItem,
  Channel,
  Post,
  WorkspaceOverview,
} from "peal-contract";

import type { Studio } from "./studio.ts";

// The view across the studio person's workspaces: the studio's own posts
// and channels counted, nothing anywhere else, and the studio's posts with
// a time as the agenda. Windows of time are left to the server's tests.

const personRequired = new Forbidden({
  code: "forbidden",
  message:
    "Only a person signed in to Peal does this, in the web app: not an API key, an application acting for them, or staff acting as them.",
  reason: "personRequired",
  requestId: "01a1d000-0000-7000-8000-000000000001",
});

const inPerson = CurrentPrincipal.pipe(
  Effect.flatMap((principal) =>
    principal._tag === "user" ? Effect.void : Effect.fail(personRequired)
  )
);

const countOf = <A>(items: readonly A[], holds: (item: A) => boolean) =>
  items.filter(holds).length;

const overviewOf = (
  studio: Studio,
  posts: readonly Post[],
  channels: readonly Channel[],
  overPlan: boolean,
  studioId: string
): WorkspaceOverview[] =>
  studio.me.workspaces.map((workspace) => {
    const bare = {
      id: workspace.id,
      name: workspace.name,
      role: workspace.role,
      slug: workspace.slug,
    };

    if (workspace.twoStepRequired && !studio.me.user.twoStepEnabled) {
      return {
        ...bare,
        channels: null,
        inbox: null,
        overPlan: null,
        posts: null,
        refused: "twoStepRequired",
      };
    }

    const own = workspace.id === studioId;
    const kept = own ? posts : [];
    const connected = own ? channels : [];

    return {
      ...bare,
      channels: workspace.permissions.includes("channel:read")
        ? {
            connected: connected.length,
            off: countOf(connected, ({ status }) => status._tag === "disabled"),
            toReconnect: countOf(
              connected,
              ({ status }) => status._tag === "refreshNeeded"
            ),
          }
        : null,
      inbox: workspace.permissions.includes("engagement:read")
        ? { unanswered: 0 }
        : null,
      overPlan: own && overPlan,
      posts: workspace.permissions.includes("post:read")
        ? {
            awaitingApproval: countOf(
              kept,
              ({ status }) => status === "awaitingApproval"
            ),
            failedLast7Days: countOf(
              kept,
              ({ outcome }) =>
                outcome === "failed" || outcome === "partiallyPublished"
            ),
            mayApprove: workspace.permissions.includes("post:approve"),
            scheduledNext7Days: countOf(
              kept,
              ({ status }) => status === "scheduled"
            ),
            unconfirmedLast7Days: countOf(
              kept,
              ({ outcome }) => outcome === "unconfirmed"
            ),
          }
        : null,
      refused: null,
    };
  });

const listed = new Set([
  "awaitingApproval",
  "scheduled",
  "publishing",
  "finished",
]);

export const overviewGroupLive = (studio: Studio, studioId: string) =>
  HttpApiBuilder.group(Api, "overview", (handlers) =>
    handlers.handleAll({
      agenda: ({ query }) =>
        Effect.gen(function* agenda() {
          yield* inPerson;

          const days = Duration.toDays(DateTime.distance(query.from, query.to));

          if (days <= 0 || days > maxAgendaDays) {
            return yield* new InvalidTimeRange({
              code: "invalid_time_range",
              message:
                "The range ends before it starts, or spans more than 31 days.",
              requestId: "01a1d000-0000-7000-8000-000000000002",
            });
          }

          if (query.cursor !== undefined) {
            return yield* new HttpApiError.BadRequest();
          }

          const asked = query.workspaceIds?.split(",") ?? [studioId];
          const { posts } = yield* Ref.get(studio.state);

          const items = asked.includes(studioId)
            ? posts.flatMap((post): AgendaItem[] =>
                post.schedule !== null &&
                listed.has(post.status) &&
                !DateTime.isLessThan(post.schedule.at, query.from) &&
                DateTime.isLessThan(post.schedule.at, query.to)
                  ? [
                      {
                        excerpt: post.content.text,
                        platforms: ["mastodon"],
                        postId: post.id,
                        scheduledAt: post.schedule.at,
                        status: post.status,
                        timeZone: post.schedule.timeZone,
                        workspaceId: studioId,
                      },
                    ]
                  : []
              )
            : [];

          return {
            items: items.slice(0, query.limit ?? defaultAgendaPageSize),
            nextCursor: null,
          };
        }),
      get: () =>
        Effect.gen(function* get() {
          yield* inPerson;

          const { channels, overPlan, posts } = yield* Ref.get(studio.state);

          return {
            generatedAt: DateTime.makeUnsafe("2026-11-12T09:00:00Z"),
            nextCursor: null,
            workspaces: overviewOf(studio, posts, channels, overPlan, studioId),
          };
        }),
    })
  );
