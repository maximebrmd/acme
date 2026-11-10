import { Console, DateTime, Effect, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { InvitationSchema, RoleSchema } from "peal-contract";

import { personOnly } from "#api-key.ts";
import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import { columns, instant } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const list = Command.make(
  "list",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("invitations.list")(function* list({ json, workspace: choice }) {
    yield* personOnly("list a workspace's invitations");

    const { client, url, workspace } = yield* inWorkspace(choice);

    const pending = yield* client.invitations
      .list({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(Schema.Array(InvitationSchema), pending);

      return;
    }

    if (pending.length === 0) {
      yield* Console.log(`${workspace.name} has no pending invitations.`);

      return;
    }

    const now = yield* DateTime.now;

    yield* Console.log(`Pending invitations to ${workspace.name}:`);

    for (const line of columns(
      pending.map((invitation) => [
        `  ${invitation.id}`,
        invitation.email,
        invitation.role,
        DateTime.isLessThan(invitation.expiresAt, now)
          ? `expired ${instant(invitation.expiresAt)}`
          : `expires ${instant(invitation.expiresAt)}`,
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's pending invitations, expired ones included. Needs the right to invite."
  )
);

const send = Command.make(
  "send",
  {
    email: Argument.String("email").pipe(
      Argument.withDescription("The address to invite.")
    ),
    json: jsonFlag,
    role: Flag.Literals("role", RoleSchema.literals).pipe(
      Flag.withDescription(
        "The role they get on joining. Only owners invite owners."
      ),
      Flag.withDefault("viewer")
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("invitations.send")(function* send({
    email,
    json,
    role,
    workspace: choice,
  }) {
    yield* personOnly("invite someone");

    const { client, url, workspace } = yield* inWorkspace(choice);

    const sent = yield* client.invitations
      .create({
        params: { workspaceId: workspace.id },
        payload: { email, role },
      })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(InvitationSchema, sent);

      return;
    }

    yield* Console.log(
      `Invited ${sent.email} to ${workspace.name} as ${sent.role}: Peal emailed them a link that works until ${instant(sent.expiresAt)}. Invitation ${sent.id}.`
    );
  })
).pipe(
  Command.withDescription(
    "Invite someone to the workspace by email, with a role. A pending invitation to the same address is replaced."
  )
);

const revoke = Command.make(
  "revoke",
  {
    invitationId: Argument.String("invitation-id").pipe(
      Argument.withDescription(
        "The invitation, as peal invitations list shows its id."
      )
    ),
    json: jsonFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("invitations.revoke")(function* revoke({
    invitationId,
    json,
    workspace: choice,
  }) {
    yield* personOnly("revoke an invitation");

    const { client, url, workspace } = yield* inWorkspace(choice);

    yield* client.invitations
      .revoke({ params: { invitationId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* json
      ? printNothing
      : Console.log(
          `Revoked invitation ${invitationId} to ${workspace.name}: its link no longer works.`
        );
  })
).pipe(
  Command.withDescription(
    "Revoke a pending invitation: its link stops working at once."
  )
);

export const invitations = Command.make("invitations").pipe(
  Command.withDescription(
    "Who is invited to a workspace. For a person signed in: an API key may not read or send invitations."
  ),
  Command.withSubcommands([list, send, revoke])
);
