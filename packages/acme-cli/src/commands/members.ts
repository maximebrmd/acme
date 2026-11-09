import { Console, Effect } from "effect";
import { Command } from "effect/cli";

import { explain } from "#explain.ts";
import { columns, instant } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const list = Command.make(
  "list",
  { workspace: workspaceFlag },
  Effect.fn("members.list")(function* list({ workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const members = yield* client.members
      .list({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(`Members of ${workspace.name}:`);

    for (const line of columns(
      members.map((member) => [
        `  ${member.name} <${member.email}>`,
        member.role,
        `joined ${instant(member.joinedAt)}`,
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's members and their roles, in the order they joined."
  )
);

export const members = Command.make("members").pipe(
  Command.withDescription(
    "Who belongs to a workspace. Changing a role or removing someone is for the web app's settings."
  ),
  Command.withSubcommands([list])
);
