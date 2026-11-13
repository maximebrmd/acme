import {
  Console,
  DateTime,
  Effect,
  FileSystem,
  Option,
  Path,
  Random,
  Schema,
} from "effect";
import { Command, Flag } from "effect/cli";
import { AccountExportSchema, ConnectedAppSchema } from "peal-contract";
import type { ConnectedApp } from "peal-contract";

import { personOnly } from "#api-key.ts";
import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
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

const existing = (file: string) =>
  new Refused({
    reason: `${file} exists already: give another --output, or --force to replace it.`,
  });

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
        "Where to save the copy. Defaults to the name the server gives it, such as peal-data-2026-11-09.json, in the current folder."
      ),
      Flag.optional
    ),
  },
  Effect.fn("account.export")(function* exportData({ force, output }) {
    yield* personOnly("export an account's data");

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

        yield* exists && !force ? existing(file) : Effect.void;
      });

    // A file made for the copy alone, readable by the user only: created
    // exclusively, it follows no link left there and replaces nothing,
    // even one made since it was checked. Removed when writing it fails.
    const created = (file: string, contents: string) =>
      fs
        .writeFileString(file, contents, { flag: "wx", mode: fileMode })
        .pipe(
          Effect.tapError((failure) =>
            failure.reason._tag === "AlreadyExists"
              ? Effect.void
              : fs.remove(file).pipe(Effect.ignore)
          )
        );

    // Without --force, the copy goes in a new file. With it, it goes in one
    // of its own beside the file, then is renamed over it: a file replaced
    // is never readable by others, even for a moment.
    const saved = (file: string, contents: string) =>
      force
        ? Effect.gen(function* replacing() {
            const suffix = yield* Random.nextIntBetween(0, 2 ** 31);
            const temporary = `${file}.${suffix.toString(36)}.tmp`;

            yield* created(temporary, contents);
            yield* fs
              .rename(temporary, file)
              .pipe(
                Effect.tapError(() => fs.remove(temporary).pipe(Effect.ignore))
              );
          })
        : created(file, contents);

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
          () => `peal-data-${DateTime.formatIsoDateUtc(body.exportedAt)}.json`
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

    yield* saved(file, `${json}\n`).pipe(
      Effect.mapError((failure) =>
        failure.reason._tag === "AlreadyExists"
          ? existing(file)
          : cannotSave(file)(failure)
      )
    );

    yield* Console.log(
      `Saved a copy of your data on ${url} to ${file}, which only you may read. It holds your account, sessions, workspaces, invitations, connected applications, notices and the posts you wrote, and no password, token or key.`
    );
  })
).pipe(
  Command.withDescription(
    "Save a copy of everything Peal keeps about you, as JSON, in a file only you may read."
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
  { json: jsonFlag },
  Effect.fn("account.apps")(function* listApps({ json }) {
    yield* personOnly("list an account's applications");

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

    if (json) {
      yield* printJson(Schema.Array(ConnectedAppSchema), found);

      return;
    }

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
