import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  ConnectLinkLocaleSchema,
  defaultConnectLinkHours,
  maxConnectLinkHours,
  minConnectLinkHours,
  PlatformSchema,
} from "peal-contract";
import type { ConnectLink, HostedConnectFailure } from "peal-contract";

import { explain } from "#explain.ts";
import { columns, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const decodePlatform = Schema.decodeUnknownOption(PlatformSchema);

const decodeLocale = Schema.decodeUnknownOption(ConnectLinkLocaleSchema);

// `--platform`, when it names one Peal knows: refused before anything is
// asked of the server otherwise.
const platformOf = (given: string) =>
  Option.match(decodePlatform(given), {
    onNone: () =>
      Effect.fail(
        new Refused({
          reason: `--platform takes one of these: ${PlatformSchema.literals.join(", ")}.`,
        })
      ),
    onSome: Effect.succeed,
  });

// `--locale`, when given: a language the hosted page is written in.
const localeOf = (given: Option.Option<string>) =>
  Option.match(given, {
    onNone: () => Effect.succeedNone,
    onSome: (locale) =>
      Option.match(decodeLocale(locale), {
        onNone: () =>
          Effect.fail(new Refused({ reason: "--locale takes en or fr." })),
        onSome: (known) => Effect.succeed(Option.some(known)),
      }),
  });

const linkArgument = Argument.String("link-id").pipe(
  Argument.withDescription("The link, as peal links list shows its id.")
);

const statuses: Readonly<Record<ConnectLink["status"], string>> = {
  completed: "used",
  expired: "expired",
  pending: "waiting",
  revoked: "revoked",
};

// Why a link's last sign-in connected nothing, in words.
const failures: Readonly<Record<HostedConnectFailure, string>> = {
  accountMismatch: "they signed in to another account than the channel's",
  authorizationFailed: "the platform did not hand over the account",
  channelGone: "the channel to reconnect was disconnected",
  denied: "they refused on the platform",
  instanceNotAllowed: "the server they gave is not on the public internet",
  invalidHandle: "the handle they gave names no account",
  invalidInstance: "what they gave is not the address of a server",
  invalidState: "the sign-in expired, or ended in another browser",
  linkCompleted: "the link was used already",
  linkExpired: "the link had expired",
  linkRevoked: "the link was revoked",
  noAccounts: "the sign-in reached no account Peal can post to",
  notConfigured: "this server is not set up for the platform",
  planLimit: "the workspace's plan has no room for one more channel",
  platformNotSupported: "this server cannot connect the platform",
  platformUnreachable: "the platform did not answer",
  tooManyAttempts: "the link's sign-in was started too many times",
};

// A link, a line per thing known of it. Never its address, which the
// server shows once, when it is created.
const linkLines = (link: ConnectLink): string[] =>
  columns([
    ["  Platform", link.platform],
    ["  Status", statuses[link.status]],
    ["  Expires", instant(link.expiresAt)],
    ...(link.channelId === null ? [] : [["  Reconnects", link.channelId]]),
    ...(link.channelIds.length === 0
      ? []
      : [["  Connected", link.channelIds.join(", ")]]),
    ...(link.returnUrl === null ? [] : [["  Returns to", link.returnUrl]]),
    ...(link.failure === null
      ? []
      : [["  Last sign-in", `failed: ${failures[link.failure]}`]]),
  ]);

const create = Command.make(
  "create",
  {
    channel: Flag.String("channel").pipe(
      Flag.withMetavar("<channel-id>"),
      Flag.withDescription(
        "Reconnect this channel instead of connecting a new account."
      ),
      Flag.optional
    ),
    hours: Flag.Int("hours").pipe(
      Flag.withDescription(
        `How long the link works, in hours, from ${String(minConnectLinkHours)} to ${String(maxConnectLinkHours)}: ${String(defaultConnectLinkHours)} unless given.`
      ),
      Flag.optional
    ),
    locale: Flag.String("locale").pipe(
      Flag.withMetavar("<en|fr>"),
      Flag.withDescription(
        "The language the page opens in: the visitor's own unless given."
      ),
      Flag.optional
    ),
    platform: Flag.String("platform").pipe(
      Flag.withMetavar("<platform>"),
      Flag.withDescription(
        `The platform of the account to connect: ${PlatformSchema.literals.join(", ")}.`
      )
    ),
    returnUrl: Flag.String("return-url").pipe(
      Flag.withMetavar("<https-url>"),
      Flag.withDescription(
        "Where the page sends them once done: an address on an origin the workspace's partner account registered."
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("links.create")(function* create({
    channel,
    hours,
    locale,
    platform,
    returnUrl,
    workspace: choice,
  }) {
    const known = yield* platformOf(platform);
    const language = yield* localeOf(locale);

    const { client, url, workspace } = yield* inWorkspace(choice);

    const created = yield* client.connectLinks
      .create({
        params: { workspaceId: workspace.id },
        payload: {
          platform: known,
          ...Option.match(channel, {
            onNone: () => ({}),
            onSome: (channelId) => ({ channelId }),
          }),
          ...Option.match(hours, {
            onNone: () => ({}),
            onSome: (expiresInHours) => ({ expiresInHours }),
          }),
          ...Option.match(language, {
            onNone: () => ({}),
            onSome: (chosen) => ({ locale: chosen }),
          }),
          ...Option.match(returnUrl, {
            onNone: () => ({}),
            onSome: (address) => ({ returnUrl: address }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Created the connect link ${created.link.id} for ${workspace.name}.`
    );

    for (const line of linkLines(created.link)) {
      yield* Console.log(line);
    }

    yield* Console.log("");
    yield* Console.log(
      "Its address, shown this once: hand it to the account's owner over a channel you trust. Whoever holds it can connect an account of theirs to the workspace until it is used, revoked or expired."
    );
    yield* Console.log(created.url);
  })
).pipe(
  Command.withDescription(
    "Create a link to hand to whoever owns a social account: it opens a hosted page where they connect it to the workspace, without a Peal account. It works once."
  )
);

const list = Command.make(
  "list",
  { workspace: workspaceFlag },
  Effect.fn("links.list")(function* list({ workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const links = yield* client.connectLinks
      .list({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (links.length === 0) {
      yield* Console.log(`${workspace.name} has no connect link.`);

      return;
    }

    yield* Console.log(`Connect links of ${workspace.name}:`);

    for (const line of columns(
      links.map((link) => [
        `  ${link.id}`,
        link.platform,
        statuses[link.status],
        `expires ${instant(link.expiresAt)}`,
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's connect links, newest first: those waiting, and those used, revoked or expired in the last 30 days."
  )
);

const show = Command.make(
  "show",
  { link: linkArgument, workspace: workspaceFlag },
  Effect.fn("links.show")(function* show({ link, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const found = yield* client.connectLinks
      .get({ params: { linkId: link, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(`Connect link ${found.id}:`);

    for (const line of linkLines(found)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Show where a connect link stands: the channels it connected once used, and how its last sign-in failed."
  )
);

const revoke = Command.make(
  "revoke",
  { link: linkArgument, workspace: workspaceFlag },
  Effect.fn("links.revoke")(function* revoke({ link, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const revoked = yield* client.connectLinks
      .revoke({ params: { linkId: link, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      revoked.status === "revoked"
        ? `Revoked the connect link ${revoked.id}: it opens nothing more.`
        : `The connect link ${revoked.id} was ${statuses[revoked.status]} already: nothing changed.`
    );
  })
).pipe(
  Command.withDescription(
    "Take a connect link back: it opens nothing more, and a sign-in in progress through it does not complete."
  )
);

export const links = Command.make("links").pipe(
  Command.withDescription(
    "Connect links: hosted pages where an account's owner connects it to a workspace without a Peal account."
  ),
  Command.withSubcommands([create, list, show, revoke])
);
