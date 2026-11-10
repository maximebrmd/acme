import { Console, Effect, Schema } from "effect";
import { Command } from "effect/cli";
import { WorkspaceMemberSchema } from "peal-contract";

import { personOnly } from "#api-key.ts";
import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, instant } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const list = Command.make(
  "list",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("members.list")(function* list({ json, workspace: choice }) {
    yield* personOnly("list a workspace's members");

    const { client, url, workspace } = yield* inWorkspace(choice);

    const members = yield* client.members
      .list({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(Schema.Array(WorkspaceMemberSchema), members);

      return;
    }

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
    "List the workspace's members and their roles, in the order they joined. For a person signed in: an API key may not read members."
  )
);

export const members = Command.make("members").pipe(
  Command.withDescription(
    "Who belongs to a workspace. Changing a role or removing someone is for the web app's settings."
  ),
  Command.withSubcommands([list])
);
