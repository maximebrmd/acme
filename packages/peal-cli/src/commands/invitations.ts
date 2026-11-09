import { Console, DateTime, Effect } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { RoleSchema } from "peal-contract";

import { explain } from "#explain.ts";
import { columns, instant } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const list = Command.make(
  "list",
  { workspace: workspaceFlag },
  Effect.fn("invitations.list")(function* list({ workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const pending = yield* client.invitations
      .list({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

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
    role,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const sent = yield* client.invitations
      .create({
        params: { workspaceId: workspace.id },
        payload: { email, role },
      })
      .pipe(Effect.mapError(explain(url)));

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
    workspace: workspaceFlag,
  },
  Effect.fn("invitations.revoke")(function* revoke({
    invitationId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    yield* client.invitations
      .revoke({ params: { invitationId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Revoked invitation ${invitationId} to ${workspace.name}: its link no longer works.`
    );
  })
).pipe(
  Command.withDescription(
    "Revoke a pending invitation: its link stops working at once."
  )
);

export const invitations = Command.make("invitations").pipe(
  Command.withDescription("Who is invited to a workspace."),
  Command.withSubcommands([list, send, revoke])
);
