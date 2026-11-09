import {
  Config,
  Context,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Redacted,
  Schema,
} from "effect";
import type { DateTime } from "effect";

import { CredentialStoreFailed } from "#credential-store-failed.ts";

/** A saved sign-in to one server: OAuth tokens, kept from the logs. */
export interface Credentials {
  readonly accessToken: Redacted.Redacted;
  /** When the access token stops working; the refresh token renews it. */
  readonly expiresAt: DateTime.Utc;
  readonly refreshToken: Option.Option<Redacted.Redacted>;
  /** The scopes the user approved. */
  readonly scope: string;
}

const SavedSignInSchema = Schema.Struct({
  accessToken: Schema.String,
  expiresAt: Schema.DateTimeUtcFromString,
  refreshToken: Schema.optionalKey(Schema.String),
  scope: Schema.String,
});

type SavedSignIn = typeof SavedSignInSchema.Type;

// One file for every server, keyed by the API URL the commands point at.
const CredentialsFileSchema = Schema.fromJsonString(
  Schema.Struct({
    servers: Schema.Record(Schema.String, SavedSignInSchema),
    version: Schema.Literal(1),
  })
);

type CredentialsFile = typeof CredentialsFileSchema.Type;

const decodeFile = Schema.decodeEffect(CredentialsFileSchema);

const encodeFile = Schema.encodeEffect(CredentialsFileSchema);

const emptyFile: CredentialsFile = { servers: {}, version: 1 };

// Only the user may read the tokens, or list the folder that holds them.
const fileMode = 0o600;

const directoryMode = 0o700;

const fromSaved = (saved: SavedSignIn): Credentials => ({
  accessToken: Redacted.make(saved.accessToken),
  expiresAt: saved.expiresAt,
  refreshToken: Option.fromUndefinedOr(saved.refreshToken).pipe(
    Option.map(Redacted.make)
  ),
  scope: saved.scope,
});

const toSaved = (credentials: Credentials): SavedSignIn => ({
  accessToken: Redacted.value(credentials.accessToken),
  expiresAt: credentials.expiresAt,
  ...Option.match(credentials.refreshToken, {
    onNone: () => ({}),
    onSome: (token) => ({ refreshToken: Redacted.value(token) }),
  }),
  scope: credentials.scope,
});

const failed =
  (at: string) =>
  (failure: { readonly message: string }): CredentialStoreFailed =>
    new CredentialStoreFailed({ detail: failure.message, file: at });

/**
 * Where the sign-ins are saved: ACME_CONFIG_DIR, or an `acme` folder in the
 * user's configuration directory (XDG_CONFIG_HOME, APPDATA on Windows, then
 * ~/.config).
 */
const directoryConfig = (path: Path.Path) =>
  Config.String("ACME_CONFIG_DIR").pipe(
    Config.orElse(() =>
      Config.String("XDG_CONFIG_HOME").pipe(
        Config.map((directory) => path.join(directory, "acme"))
      )
    ),
    Config.orElse(() =>
      Config.String("APPDATA").pipe(
        Config.map((directory) => path.join(directory, "acme"))
      )
    ),
    Config.orElse(() =>
      Config.String("HOME").pipe(
        Config.map((home) => path.join(home, ".config", "acme"))
      )
    )
  );

/**
 * The sign-ins the command line saved, one per server, in a JSON file only
 * the user may read (0600, in a 0700 folder). A file is replaced whole, by
 * renaming a new one over it, so a crash never leaves half of it.
 */
export class CredentialStore extends Context.Service<
  CredentialStore,
  {
    /** The file the sign-ins are saved in. */
    readonly file: Effect.Effect<string, CredentialStoreFailed>;
    readonly read: (
      server: URL
    ) => Effect.Effect<Option.Option<Credentials>, CredentialStoreFailed>;
    /** Forgets the server's sign-in, and says whether there was one. */
    readonly remove: (
      server: URL
    ) => Effect.Effect<boolean, CredentialStoreFailed>;
    readonly write: (
      server: URL,
      credentials: Credentials
    ) => Effect.Effect<void, CredentialStoreFailed>;
  }
>()("acme-cli/CredentialStore") {
  static readonly layer = Layer.effect(
    CredentialStore,
    Effect.gen(function* credentialStore() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const file = directoryConfig(path).pipe(
        Effect.map((directory) => path.join(directory, "credentials.json")),
        Effect.mapError(
          () =>
            new CredentialStoreFailed({
              detail: "no configuration directory: set ACME_CONFIG_DIR or HOME",
              file: "credentials.json",
            })
        )
      );

      const load = (at: string) =>
        fs.exists(at).pipe(
          Effect.flatMap((exists) =>
            exists
              ? fs.readFileString(at).pipe(Effect.flatMap(decodeFile))
              : Effect.succeed(emptyFile)
          ),
          Effect.mapError(failed(at))
        );

      const save = (at: string, contents: CredentialsFile) =>
        Effect.gen(function* saveFile() {
          const temporary = `${at}.tmp`;
          const json = yield* encodeFile(contents);

          yield* fs.makeDirectory(path.dirname(at), {
            mode: directoryMode,
            recursive: true,
          });
          yield* fs.writeFileString(temporary, json, { mode: fileMode });
          // A temporary file left by an earlier run keeps its mode when
          // written again.
          yield* fs.chmod(temporary, fileMode);
          yield* fs.rename(temporary, at);
        }).pipe(Effect.mapError(failed(at)));

      return CredentialStore.of({
        file,
        read: (server) =>
          Effect.gen(function* read() {
            const at = yield* file;
            const { servers } = yield* load(at);

            return Option.fromUndefinedOr(servers[server.href]).pipe(
              Option.map(fromSaved)
            );
          }),
        remove: (server) =>
          Effect.gen(function* remove() {
            const at = yield* file;
            const contents = yield* load(at);

            if (!(server.href in contents.servers)) {
              return false;
            }

            const servers = Object.fromEntries(
              Object.entries(contents.servers).filter(
                ([key]) => key !== server.href
              )
            );

            yield* save(at, { ...contents, servers });

            return true;
          }),
        write: (server, credentials) =>
          Effect.gen(function* write() {
            const at = yield* file;
            const contents = yield* load(at);

            yield* save(at, {
              ...contents,
              servers: {
                ...contents.servers,
                [server.href]: toSaved(credentials),
              },
            });
          }),
      });
    })
  );
}
