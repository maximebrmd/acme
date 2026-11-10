import { Console, Effect, Option } from "effect";
import { Command, Flag } from "effect/cli";
import {
  ActivityPageSchema,
  activityRetentionDays,
  maxActivityPageSize,
} from "peal-contract";
import type { ActivityEvent, ActivityVia } from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, instant } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const ways: Readonly<Record<ActivityVia, string>> = {
  apiKey: "API key",
  connectLink: "connect link",
  mcp: "MCP",
  oauth: "application",
  partnerKey: "partner key",
  session: "web app",
};

// Who asked: the member, by id, or the key; a member whose account was
// closed since is no longer named.
const actorOf = ({ actor, impersonated }: ActivityEvent): string => {
  if (actor._tag === "apiKey") {
    return `key ${actor.apiKeyId}`;
  }

  const member =
    actor.userId === null ? "a former member" : `user ${actor.userId}`;

  return impersonated ? `${member} (staff acting as them)` : member;
};

// Through what: the way in, and the key or the application by the name it
// had then.
const throughOf = ({ application, via }: ActivityEvent): string => {
  if (application === null) {
    return ways[via];
  }

  return `${ways[via]} ${application.name ?? application.id}`;
};

// How it was answered: the status, and the error's code when it was
// refused or failed.
const answerOf = ({ errorCode, status }: ActivityEvent): string => {
  const answered = status === null ? "–" : String(status);

  return errorCode === null ? answered : `${answered} ${errorCode}`;
};

const namedBy = ({ objectIds }: ActivityEvent): string =>
  Object.entries(objectIds)
    .map(([name, id]) => `${name}=${id}`)
    .join(" ");

const eventRow = (event: ActivityEvent): string[] => [
  `  ${instant(event.occurredAt)}`,
  event.operation,
  answerOf(event),
  actorOf(event),
  throughOf(event),
  namedBy(event),
  event.requestId === null ? "" : `request ${event.requestId}`,
];

// A flag left out asks for nothing.
const given = <A, B>(flag: Option.Option<A>, asked: (value: A) => B) =>
  Option.match(flag, { onNone: () => ({}), onSome: asked });

const list = Command.make(
  "list",
  {
    actor: Flag.String("actor").pipe(
      Flag.withMetavar("<user-id|api-key-id>"),
      Flag.withDescription(
        "Only what this member, by their user id, or this API key, by its id, asked for."
      ),
      Flag.optional
    ),
    cursor: Flag.String("cursor").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription("Where the page before ended, as it printed."),
      Flag.optional
    ),
    json: jsonFlag,
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many events a page holds, at most ${String(maxActivityPageSize)}.`
      ),
      Flag.optional
    ),
    operation: Flag.String("operation").pipe(
      Flag.withMetavar("<group.endpoint>"),
      Flag.withDescription(
        "Only this operation, such as posts.schedule, or mcp.create_draft for a tool of the MCP endpoint."
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("activity.list")(function* list(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const page = yield* client.activity
      .list({
        params: { workspaceId: workspace.id },
        query: {
          ...given(input.actor, (actor) => ({ actor })),
          ...given(input.cursor, (cursor) => ({ cursor })),
          ...given(input.limit, (size) => ({
            limit: Math.min(Math.max(size, 1), maxActivityPageSize),
          })),
          ...given(input.operation, (operation) => ({ operation })),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ActivityPageSchema, page);

      return;
    }

    if (page.items.length === 0) {
      yield* Console.log(
        `Nothing in the activity log of ${workspace.name} matches: it keeps the requests that asked to change something, for ${String(activityRetentionDays)} days.`
      );

      return;
    }

    yield* Console.log(`Activity in ${workspace.name}, newest first:`);

    for (const line of columns(page.items.map(eventRow))) {
      yield* Console.log(line.trimEnd());
    }

    if (page.nextCursor !== null) {
      yield* Console.log(
        `More: peal activity list --workspace ${workspace.slug} --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    `List the requests that asked to change something in the workspace, newest first: when, the operation, the status answered and the error's code, who asked, through which key or application, and the ids the request named. Owners read it; an event is kept ${String(activityRetentionDays)} days.`
  )
);

export const activity = Command.make("activity").pipe(
  Command.withDescription(
    "The workspace's activity log: who changed what, through which application."
  ),
  Command.withSubcommands([list])
);
