import { AccountExportSchema } from "acme-contract";
import type { ConnectedApp } from "acme-contract";
import {
  Console,
  DateTime,
  Effect,
  FileSystem,
  Option,
  Path,
  Schema,
} from "effect";
import { Command, Flag } from "effect/cli";

import { explain } from "#explain.ts";
import { columns, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { signedIn } from "#workspace.ts";

// The copy holds the user's personal data: only they may read the file.
const fileMode = 0o600;

const encodeExport = Schema.encodeEffect(
  Schema.toCodecJson(AccountExportSchema)
);

// The name the server gives the file, when it is a plain file name: a
// server never picks a folder to write in.
const serverFileName = (disposition: string): Option.Option<string> =>
  Option.fromNullishOr(/filename="(?<name>[\w.-]+)"/u.exec(disposition)).pipe(
    Option.flatMap((match) => Option.fromUndefinedOr(match.groups?.["name"])),
    Option.filter((name) => !name.startsWith("."))
  );

const cannotSave =
  (file: string) =>
  (failure: { readonly message: string }): Refused =>
    new Refused({ reason: `Cannot save ${file} (${failure.message}).` });

// An older server, or a suspended account, refuses the command line.
const refusedHere = (url: string, what: string) =>
  new Refused({
    reason: `${url} does not show ${what} to the command line: the server may be older than it, or your account was suspended. Account settings, in the web app, show it.`,
  });

const exportData = Command.make(
  "export",
  {
    force: Flag.Boolean("force").pipe(
      Flag.withDescription("Replace the file when it exists."),
      Flag.withDefault(false)
    ),
    output: Flag.String("output").pipe(
      Flag.withAlias("o"),
      Flag.withMetavar("<file>"),
      Flag.withDescription(
        "Where to save the copy. Defaults to the name the server gives it, such as acme-data-2026-11-09.json, in the current folder."
      ),
      Flag.optional
    ),
  },
  Effect.fn("account.export")(function* exportData({ force, output }) {
    const { client, url } = yield* signedIn;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    // Refuses a file that exists, unless asked to replace it: before the
    // request when the user named it, after when the server does.
    const checkFree = (file: string) =>
      Effect.gen(function* checkingFree() {
        const exists = yield* fs
          .exists(file)
          .pipe(Effect.mapError(cannotSave(file)));

        if (exists && !force) {
          yield* new Refused({
            reason: `${file} exists already: give another --output, or --force to replace it.`,
          });
        }
      });

    const named = output.pipe(Option.map((file) => path.resolve(file)));

    if (Option.isSome(named)) {
      yield* checkFree(named.value);
    }

    const { body, headers } = yield* client.account
      .export()
      .pipe(
        Effect.mapError((failure) =>
          failure._tag === "Forbidden"
            ? refusedHere(url, "your data")
            : explain(url)(failure)
        )
      );

    const file = Option.getOrElse(named, () =>
      path.resolve(
        Option.getOrElse(
          serverFileName(headers["content-disposition"]),
          () => `acme-data-${DateTime.formatIsoDateUtc(body.exportedAt)}.json`
        )
      )
    );

    if (Option.isNone(named)) {
      yield* checkFree(file);
    }

    const json = JSON.stringify(
      yield* encodeExport(body).pipe(Effect.orDie),
      null,
      2
    );

    // Written beside it, readable by the user alone, then renamed over it:
    // a file replaced is never readable by others, even for a moment.
    const temporary = `${file}.tmp`;

    yield* fs.writeFileString(temporary, `${json}\n`, { mode: fileMode }).pipe(
      // A temporary file left by an earlier run keeps its mode.
      Effect.andThen(fs.chmod(temporary, fileMode)),
      Effect.andThen(fs.rename(temporary, file)),
      Effect.mapError(cannotSave(file))
    );

    yield* Console.log(
      `Saved a copy of your data on ${url} to ${file}, which only you may read. It holds your account, sessions, workspaces, invitations, connected applications, notices and the posts you wrote, and no password, token or key.`
    );
  })
).pipe(
  Command.withDescription(
    "Save a copy of everything Acme keeps about you, as JSON, in a file only you may read."
  )
);

const scopesOf = (app: ConnectedApp): string =>
  app.scopes.filter((scope) => scope.startsWith("workspace:")).join(" ");

const whereOf = (app: ConnectedApp): string =>
  app.workspaces.length === 0
    ? "any workspace"
    : app.workspaces.map(({ id, name }) => name ?? id).join(", ");

const apps = Command.make(
  "apps",
  {},
  Effect.fn("account.apps")(function* listApps() {
    const { client, url } = yield* signedIn;

    const found = yield* client.connectedApps
      .list()
      .pipe(
        Effect.mapError((failure) =>
          failure._tag === "Forbidden"
            ? refusedHere(url, "your applications")
            : explain(url)(failure)
        )
      );

    if (found.length === 0) {
      yield* Console.log(`No application acts for you on ${url}.`);

      return;
    }

    yield* Console.log(`Applications that act for you on ${url}:`);

    for (const line of columns(
      found.map((app) => [
        `  ${app.name ?? app.clientId}`,
        app.clientId,
        scopesOf(app),
        whereOf(app),
        app.lastUsedAt === null
          ? `allowed ${instant(app.authorizedAt)}`
          : `last used ${instant(app.lastUsedAt)}`,
      ])
    )) {
      yield* Console.log(line);
    }

    yield* Console.log(
      "Revoke one from Account settings in the web app: an application cannot revoke another, not even the command line."
    );
  })
).pipe(
  Command.withDescription(
    "List the applications that act for you, such as this command line and MCP clients, with what they may do and where."
  )
);

export const account = Command.make("account").pipe(
  Command.withDescription(
    "Your own data. Deleting the account is for the web app's Account settings."
  ),
  Command.withSubcommands([exportData, apps])
);
