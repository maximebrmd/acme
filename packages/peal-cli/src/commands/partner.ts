import { Console, Effect, Option, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import {
  CustomerWorkspacePageSchema,
  PartnerKeySchema,
  PartnerStandingSchema,
} from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, instant } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const show = Command.make(
  "show",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("partner.show")(function* show({ json, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const standing = yield* client.partnerAccount
      .get({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(PartnerStandingSchema, standing);

      return;
    }

    const { canOpen, partner, usage } = standing;

    if (partner === null) {
      yield* Console.log(
        canOpen
          ? `${workspace.name} has no partner account: an owner or an admin opens one in the web app's settings.`
          : `${workspace.name} has no partner account: this server's staff open them.`
      );

      return;
    }

    yield* Console.log(`Partner account of ${workspace.name}:`);

    for (const line of columns([
      ["  Name", partner.name],
      ["  Logo", partner.logoUrl ?? "–"],
      [
        "  Return origins",
        partner.returnOrigins.length === 0
          ? "none: hosted pages send nobody back"
          : partner.returnOrigins.join(", "),
      ],
      ["  Opened", instant(partner.createdAt)],
      ...(usage === null
        ? []
        : [
            ["  Workspaces", String(usage.workspaces)],
            ["  Channels", String(usage.channels)],
          ]),
    ])) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Show the workspace's partner account: what its customers see, where hosted pages may send them back, and what it holds."
  )
);

const keys = Command.make(
  "keys",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("partner.keys")(function* keys({ json, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const listed = yield* client.partnerAccount
      .listKeys({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(Schema.Array(PartnerKeySchema), listed);

      return;
    }

    if (listed.length === 0) {
      yield* Console.log(
        `The partner account of ${workspace.name} has no key: an owner or an admin creates one in the web app's settings.`
      );

      return;
    }

    yield* Console.log(`Partner keys of ${workspace.name}:`);

    for (const line of columns(
      listed.map((key) => [
        `  ${key.id}`,
        key.name,
        `${key.start}…`,
        key.expiresAt === null
          ? "until revoked"
          : `expires ${instant(key.expiresAt)}`,
        key.scopes.join(" "),
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the partner account's keys, never the keys themselves: each is shown once, in the web app, when it is created."
  )
);

const workspaces = Command.make(
  "workspaces",
  {
    externalId: Flag.String("external-id").pipe(
      Flag.withMetavar("<id>"),
      Flag.withDescription("The workspace with this external id, exactly."),
      Flag.optional
    ),
    json: jsonFlag,
    name: Flag.String("name").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription("The workspaces whose name holds this text."),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("partner.workspaces")(function* workspaces({
    externalId,
    json,
    name,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const page = yield* client.partnerAccount
      .listWorkspaces({
        params: { workspaceId: workspace.id },
        query: {
          ...Option.match(externalId, {
            onNone: () => ({}),
            onSome: (given) => ({ externalId: given }),
          }),
          ...Option.match(name, {
            onNone: () => ({}),
            onSome: (given) => ({ name: given }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(CustomerWorkspacePageSchema, page);

      return;
    }

    if (page.workspaces.length === 0) {
      yield* Console.log(
        `The partner account of ${workspace.name} owns no such workspace.`
      );

      return;
    }

    yield* Console.log(
      `Workspaces the partner account of ${workspace.name} owns (${String(page.workspaces.length)} of ${String(page.total)}, newest first):`
    );

    for (const line of columns(
      page.workspaces.map((owned) => [
        `  ${owned.id}`,
        owned.name,
        owned.externalId ?? "–",
        `${String(owned.channels)} channel${owned.channels === 1 ? "" : "s"}`,
        `created ${instant(owned.createdAt)}`,
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the workspaces the partner account owns, newest first, with their external ids and how many channels each has connected."
  )
);

export const partner = Command.make("partner").pipe(
  Command.withDescription(
    "A workspace's partner account, which lets a product use Peal for its own customers. Creating and deleting their workspaces is for the partner API, with a partner key."
  ),
  Command.withSubcommands([show, keys, workspaces])
);
