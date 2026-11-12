import { Console, Effect, Match, Option } from "effect";
import type { DateTime, Redacted } from "effect";
import { Command } from "effect/cli";
import { CredentialSchema, MeSchema } from "peal-contract";
import type { Credential } from "peal-contract";

import { apiKey, apiKeyVariable } from "#api-key.ts";
import { requestFailed } from "#api-request-failed.ts";
import { PealApi } from "#api.ts";
import { display } from "#display.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, instant } from "#print.ts";
import { accessToken } from "#session.ts";
import { SignInExpired } from "#sign-in-expired.ts";

const listed = (values: readonly string[]) =>
  values.length === 0 ? "none" : values.join(", ");

const expiry = (expiresAt: DateTime.Utc | null) =>
  expiresAt === null
    ? "It never expires."
    : `It expires on ${instant(expiresAt)}.`;

// What a key says of itself, in prose: never the key.
const keyLines = (url: string) =>
  Match.typeTags<Credential, readonly string[]>()({
    apiKey: ({ expiresAt, name, permissions, start, workspace }) => [
      `The API key in ${apiKeyVariable} is "${name}"${start === null ? "" : ` (${start}…)`}, of the workspace ${workspace.name} (${workspace.id}), on ${url}.`,
      `Permissions: ${listed(permissions)}.`,
      expiry(expiresAt),
    ],
    partnerKey: ({ expiresAt, name, partner, permissions, scopes, start }) => [
      `The key in ${apiKeyVariable} is the partner key "${name}" (${start}…) of ${partner.name}, on ${url}.`,
      `Scopes: ${listed(scopes)}.`,
      `Permissions in each of its workspaces: ${listed(permissions)}.`,
      expiry(expiresAt),
    ],
    user: ({ userId }) => [
      `${apiKeyVariable} signs in as the user ${userId}, on ${url}.`,
    ],
  });

// With an API key: who the key is, as the server says it.
const ofKey = Effect.fn("whoami.ofKey")(function* ofKey(
  key: Redacted.Redacted,
  json: boolean
) {
  const api = yield* PealApi;
  const url = display(api.baseUrl);
  const client = yield* api.signedIn(key);

  const credential = yield* client.credential.get().pipe(
    Effect.catchTags({
      // Revoked, expired, or its workspace's account suspended.
      Forbidden: () => Effect.fail(new SignInExpired({ url })),
      HttpClientError: (error) => Effect.fail(requestFailed(url)(error)),
      SchemaError: (error) => Effect.fail(requestFailed(url)(error)),
      Unauthenticated: () => Effect.fail(new SignInExpired({ url })),
    })
  );

  if (json) {
    yield* printJson(CredentialSchema, credential);

    return;
  }

  for (const line of keyLines(url)(credential)) {
    yield* Console.log(line);
  }
});

// Signed in as a person: who they are and their workspaces.
const ofPerson = Effect.fn("whoami.ofPerson")(function* ofPerson(
  json: boolean
) {
  const api = yield* PealApi;
  const url = display(api.baseUrl);
  const client = yield* api.signedIn(yield* accessToken);

  const me = yield* client.session.me().pipe(
    Effect.catchTags({
      // The sign-in was revoked, or its user banned.
      Forbidden: () => Effect.fail(new SignInExpired({ url })),
      HttpClientError: (error) => Effect.fail(requestFailed(url)(error)),
      SchemaError: (error) => Effect.fail(requestFailed(url)(error)),
      Unauthenticated: () => Effect.fail(new SignInExpired({ url })),
    })
  );

  if (json) {
    yield* printJson(MeSchema, me);

    return;
  }

  yield* Console.log(
    `Signed in to ${url} as ${me.user.name} <${me.user.email}>.`
  );

  if (me.workspaces.length === 0) {
    yield* Console.log("You do not belong to any workspace yet.");

    return;
  }

  yield* Console.log("Workspaces:");

  // Each with its slug and its id, which --workspace takes: an API key
  // names its workspace by the id alone.
  for (const line of columns(
    me.workspaces.map((workspace) => [
      `  ${workspace.name} (${workspace.role})`,
      workspace.slug,
      workspace.id,
    ])
  )) {
    yield* Console.log(line);
  }
});

export const whoami = Command.make(
  "whoami",
  { json: jsonFlag },
  Effect.fn("whoami")(function* whoami({ json }) {
    // An API key is nobody: it says which key it is, through the
    // credential check, rather than who.
    const key = yield* apiKey;

    yield* Option.isSome(key) ? ofKey(key.value, json) : ofPerson(json);
  })
).pipe(
  Command.withDescription(
    "Show who the command line is signed in as, and the workspaces they belong to, each with its slug and its id. With an API key (PEAL_API_KEY): the key's name, its workspace, its permissions and when it expires."
  )
);
