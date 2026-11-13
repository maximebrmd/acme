import { Config, Console, Duration, Effect, Option, Schema } from "effect";
import { Command } from "effect/cli";
import type { Me } from "peal-contract";

import { apiKey, apiKeyVariable } from "#api-key.ts";
import { PealApi } from "#api.ts";
import { mcpEndpoint } from "#commands/mcp.ts";
import { CredentialStore } from "#credentials.ts";
import { display } from "#display.ts";
import { DoctorFailed } from "#doctor-failed.ts";
import { accountPageOf, adsScope, publishScope } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns } from "#print.ts";
import {
  defaultApiUrl,
  insecureHttpFlag,
  insecureHttpVariable,
} from "#root.ts";
import { accessToken } from "#session.ts";
import { isWorkspaceId, whereTheIdIs, workspaceFlag } from "#workspace.ts";

// A check that hangs says as little as one that fails.
const checkTimeout = Duration.seconds(5);

/** One thing the doctor looked at, and what to do when it is not right. */
export const CheckSchema = Schema.Struct({
  detail: Schema.String,
  fix: Schema.optionalKey(Schema.String),
  name: Schema.String,
  status: Schema.Literals(["ok", "failing", "skipped"]),
});

export type Check = typeof CheckSchema.Type;

/** What `peal doctor --json` prints. */
export const DiagnosisSchema = Schema.Struct({
  checks: Schema.Array(CheckSchema),
  ok: Schema.Boolean,
});

const ok = (name: string, detail: string, fix?: string): Check =>
  fix === undefined
    ? { detail, name, status: "ok" }
    : { detail, fix, name, status: "ok" };

const failing = (name: string, detail: string, fix: string): Check => ({
  detail,
  fix,
  name,
  status: "failing",
});

const skipped = (name: string, detail: string): Check => ({
  detail,
  name,
  status: "skipped",
});

const unanswered = "the server did not answer";

const inClear =
  "the credential is not sent over plain HTTP to a server that is not this machine";

const pointAtIt =
  "Check that the server is running, or point --api-url or PEAL_API_URL at it.";

// Where a value that a flag or a variable gives came from: the variable
// when it holds this value, the flag otherwise.
const sourceOf = (variable: string, value: string, flag: string) =>
  Config.String(variable).pipe(
    Config.option,
    Effect.orElseSucceed(() => Option.none<string>()),
    Effect.map((set) => (Option.contains(set, value) ? variable : flag))
  );

const apiUrlCheck = Effect.gen(function* apiUrlCheck() {
  const { baseUrl, sendingCredentials } = yield* PealApi;
  const url = display(baseUrl);

  if (!(yield* sendingCredentials.pipe(Effect.isSuccess))) {
    return failing(
      "api-url",
      `${url} is reached over plain HTTP, and is not this machine: a sign-in or an API key sent there could be read on the way, so the command line sends none.`,
      `Point it at the server's https:// address with --api-url or PEAL_API_URL. For a server on a network you trust that has no TLS, pass --${insecureHttpFlag}, or set ${insecureHttpVariable}=true.`
    );
  }

  const set = yield* Config.URL("PEAL_API_URL").pipe(
    Config.option,
    Effect.orElseSucceed(() => Option.none<URL>())
  );

  if (Option.isSome(set) && display(set.value) === url) {
    return ok("api-url", `${url}, from PEAL_API_URL.`);
  }

  return ok(
    "api-url",
    Option.isNone(set) && url === display(new URL(defaultApiUrl))
      ? `${url}, the default: set PEAL_API_URL or --api-url for another server.`
      : `${url}, from --api-url.`
  );
});

// Whether the server is up, then whether it can take requests.
const serverChecks = Effect.gen(function* serverChecks() {
  const { client } = yield* PealApi;

  const up = yield* client.health().pipe(
    Effect.timeout(checkTimeout),
    Effect.as(true),
    Effect.orElseSucceed(() => false)
  );

  if (!up) {
    return {
      checks: [
        failing("health", "The server does not answer.", pointAtIt),
        skipped("ready", unanswered),
        skipped("changelog", unanswered),
      ],
      up,
    };
  }

  const ready = yield* client.ready().pipe(
    Effect.timeout(checkTimeout),
    Effect.as(ok("ready", "The server and its database both answer.")),
    Effect.orElseSucceed(() =>
      failing(
        "ready",
        "The server is up, but cannot take requests: its database does not answer.",
        "Try again shortly; if it lasts, tell the people who run the server."
      )
    )
  );

  const changelog = yield* client.changelog().pipe(
    Effect.timeout(checkTimeout),
    Effect.map(({ entries: [latest] }) =>
      latest === undefined
        ? ok("changelog", "The server lists no release of its API.")
        : ok(
            "changelog",
            `The API's latest release is of ${latest.date}: ${latest.title}`
          )
    ),
    Effect.orElseSucceed(() =>
      failing(
        "changelog",
        "The server does not answer GET /api/changelog as this command line expects: it may be older, or not a Peal server.",
        "Check the URL, or update the server or the command line so both speak the same API."
      )
    )
  );

  return {
    checks: [ok("health", "The server answers."), ready, changelog],
    up,
  };
});

const membershipLine = ({ id, name, role, slug }: Me["workspaces"][number]) =>
  `${name} (${slug}, ${id}, ${role})`;

// A workspace that requires two-step verification refuses every command
// while the account does not have it on.
const lockedOut = (
  me: Me,
  workspace: Me["workspaces"][number],
  url: string
): Option.Option<Check> =>
  workspace.twoStepRequired && !me.user.twoStepEnabled
    ? Option.some(
        failing(
          "workspace",
          `${membershipLine(workspace)} requires two-step verification, which your account does not have on: the server refuses every command there.`,
          `Turn it on at ${accountPageOf(url)}, then run the command again.`
        )
      )
    : Option.none();

// The workspace commands act in, for a person: the one they named, or
// their only one.
const personWorkspace = (
  me: Me,
  choice: Option.Option<string>,
  source: string,
  url: string
): Check => {
  const [only] = me.workspaces;

  if (Option.isSome(choice)) {
    const wanted = choice.value;

    const found = me.workspaces.find(
      ({ id, slug }) => id === wanted || slug === wanted
    );

    if (found === undefined) {
      return failing(
        "workspace",
        `${source} names ${wanted}, which is none of your workspaces: ${me.workspaces.map(membershipLine).join("; ")}.`,
        "Name one of them, by its slug or its id."
      );
    }

    return Option.getOrElse(lockedOut(me, found, url), () =>
      ok(
        "workspace",
        `Commands act in ${membershipLine(found)}, from ${source}.`
      )
    );
  }

  if (only === undefined) {
    return failing(
      "workspace",
      "You do not belong to any workspace yet.",
      "Create one in the web app, or accept an invitation."
    );
  }

  return me.workspaces.length === 1
    ? Option.getOrElse(lockedOut(me, only, url), () =>
        ok(
          "workspace",
          `Commands act in ${membershipLine(only)}, your only workspace.`
        )
      )
    : failing(
        "workspace",
        `You belong to several workspaces, and none is named: ${me.workspaces.map(membershipLine).join("; ")}.`,
        "Name one with --workspace or PEAL_WORKSPACE, by its slug or its id."
      );
};

// What the saved sign-in may do with posts: its scope says, whatever the
// user's role allows.
const scopeCheck = (scope: string): Check => {
  const scopes = scope.split(/\s+/u).filter((name) => name !== "");

  if (scopes.length === 0) {
    return skipped(
      "publish-scope",
      "The saved sign-in does not say its scopes."
    );
  }

  return scopes.includes(publishScope)
    ? ok(
        "publish-scope",
        `The sign-in has ${publishScope}: it can schedule and publish, where your role allows it.`
      )
    : ok(
        "publish-scope",
        `The sign-in was approved without ${publishScope}: it can write drafts; it cannot schedule or publish.`,
        "To schedule and publish, run peal login again and approve it. Otherwise nothing is to do: never work around it."
      );
};

// Whether the saved sign-in may work with ads, which is asked on purpose
// (peal login --ads): without it the sign-in reads ads, and spends nothing.
const adsScopeCheck = (scope: string): Check => {
  const scopes = scope.split(/\s+/u).filter((name) => name !== "");

  if (scopes.length === 0) {
    return skipped("ads-scope", "The saved sign-in does not say its scopes.");
  }

  if (!scopes.includes(adsScope)) {
    return ok(
      "ads-scope",
      `The sign-in was made without ${adsScope}, as every sign-in is unless asked: it reads ads, and cannot boost a post or pause, resume or stop a boost. peal login --ads asks for it, when the person wants this command line to spend on ads.`
    );
  }

  return ok(
    "ads-scope",
    scopes.includes(publishScope)
      ? `The sign-in has ${adsScope} and ${publishScope}: it can boost posts, which spends money, where your role and an owner's monthly ceiling allow it.`
      : `The sign-in has ${adsScope} without ${publishScope}: it can pause and stop boosts; it cannot boost a post or resume one.`
  );
};

// A person's checks: the sign-in works, what it may do, and where.
const personChecks = (choice: Option.Option<string>, up: boolean) =>
  Effect.gen(function* checkingPerson() {
    const api = yield* PealApi;
    const store = yield* CredentialStore;
    const url = display(api.baseUrl);

    const saved = yield* store
      .read(api.baseUrl)
      .pipe(Effect.orElseSucceed(() => Option.none()));

    if (Option.isNone(saved)) {
      const why = `no credential for ${url}`;

      return [
        failing(
          "credential",
          `None: ${apiKeyVariable} is not set, and no sign-in is saved for ${url}.`,
          `Run peal login, or set ${apiKeyVariable} to a workspace API key for a run nobody attends.`
        ),
        skipped("access", why),
        skipped("publish-scope", why),
        skipped("ads-scope", why),
        skipped("workspace", why),
      ];
    }

    const credential = ok(
      "credential",
      `The sign-in saved for ${url}. ${apiKeyVariable} is not set.`
    );

    const scope = scopeCheck(saved.value.scope);
    const ads = adsScopeCheck(saved.value.scope);

    if (!up) {
      return [
        credential,
        skipped("access", unanswered),
        scope,
        ads,
        skipped("workspace", unanswered),
      ];
    }

    if (!(yield* api.sendingCredentials.pipe(Effect.isSuccess))) {
      return [
        credential,
        skipped("access", inClear),
        scope,
        ads,
        skipped("workspace", inClear),
      ];
    }

    // As every command does, this renews an access token that ran out.
    const me = yield* accessToken.pipe(
      Effect.flatMap((token) => api.signedIn(token)),
      Effect.flatMap((client) => client.session.me()),
      Effect.timeout(checkTimeout),
      Effect.option
    );

    if (Option.isNone(me)) {
      return [
        credential,
        failing(
          "access",
          `${url} no longer takes the saved sign-in: it was revoked, or it ran out.`,
          "Run peal login again."
        ),
        scope,
        ads,
        skipped("workspace", "the sign-in does not work"),
      ];
    }

    const source = yield* Option.match(choice, {
      onNone: () => Effect.succeed("--workspace"),
      onSome: (wanted) => sourceOf("PEAL_WORKSPACE", wanted, "--workspace"),
    });

    return [
      credential,
      ok(
        "access",
        `Signed in as ${me.value.user.name} <${me.value.user.email}>, in ${String(me.value.workspaces.length)} ${me.value.workspaces.length === 1 ? "workspace" : "workspaces"}: ${me.value.workspaces.map(membershipLine).join("; ")}.`
      ),
      scope,
      ads,
      personWorkspace(me.value, choice, source, url),
    ];
  });

// A key's checks: it names its workspace by id, and reads it.
const keyChecks = (choice: Option.Option<string>, up: boolean) =>
  Effect.gen(function* checkingKey() {
    const api = yield* PealApi;
    const key = yield* apiKey;

    const credential = ok(
      "credential",
      `The API key in ${apiKeyVariable}, which wins over a saved sign-in.`
    );

    const scope = skipped(
      "publish-scope",
      "an API key has permissions, not scopes: it schedules and publishes with post:schedule"
    );

    const ads = skipped(
      "ads-scope",
      "an API key has permissions, not scopes: it reads ads with ads:read, and boosts with ads:spend"
    );

    const workspaceId = choice.pipe(Option.filter(isWorkspaceId));

    if (Option.isNone(workspaceId) || Option.isNone(key)) {
      return [
        credential,
        skipped("access", "the workspace's id is needed to try the key"),
        scope,
        ads,
        failing(
          "workspace",
          Option.match(choice, {
            onNone: () => "An API key is used, and no workspace is named.",
            onSome: (wanted) =>
              `An API key is used, and ${wanted} is not a workspace's id.`,
          }),
          `Give the workspace's id with --workspace or PEAL_WORKSPACE: a key cannot look workspaces up. ${whereTheIdIs}`
        ),
      ];
    }

    const workspace = ok(
      "workspace",
      `Commands act in the workspace ${workspaceId.value}.`
    );

    if (!up) {
      return [credential, skipped("access", unanswered), scope, ads, workspace];
    }

    if (!(yield* api.sendingCredentials.pipe(Effect.isSuccess))) {
      return [credential, skipped("access", inClear), scope, ads, workspace];
    }

    const client = yield* api.signedIn(key.value).pipe(Effect.orDie);

    const access = yield* client.channels
      .list({ params: { workspaceId: workspaceId.value } })
      .pipe(
        Effect.timeout(checkTimeout),
        Effect.map((channels) =>
          ok(
            "access",
            `The key reads the workspace: ${String(channels.length)} ${channels.length === 1 ? "channel" : "channels"}.`
          )
        ),
        Effect.catchTags({
          Forbidden: ({ message, permission, reason }) =>
            Effect.succeed(
              reason === "missingPermission" && permission !== undefined
                ? failing(
                    "access",
                    `The server takes the key, which lacks the permission ${permission}: it cannot list the workspace's channels.`,
                    `An owner or an admin of the workspace creates a key with ${permission}, in the web app's settings.`
                  )
                : failing(
                    "access",
                    `The server takes the key, and refuses it here: ${message ?? "it belongs to another workspace, or lacks a permission"}`,
                    "Check that the id is the key's own workspace's."
                  )
            ),
          Unauthenticated: () =>
            Effect.succeed(
              failing(
                "access",
                "The server refused the key: it was revoked, it expired, or it is another server's.",
                "An owner or an admin of the workspace creates a key, in the web app's settings."
              )
            ),
          WorkspaceNotFound: () =>
            Effect.succeed(
              failing(
                "access",
                "The server knows no such workspace for this key.",
                "Check that the id is the key's own workspace's."
              )
            ),
        }),
        Effect.orElseSucceed(() =>
          failing(
            "access",
            "The server did not answer the key's request as expected.",
            "Try again shortly."
          )
        )
      );

    return [credential, access, scope, ads, workspace];
  });

const mcpCheck = mcpEndpoint.pipe(
  Effect.map(({ discovered, endpoint }) =>
    ok(
      "mcp",
      discovered
        ? `MCP clients connect to ${endpoint}: peal mcp shows how.`
        : `MCP clients would connect to ${endpoint}, a guess from the API's URL: the server did not say.`
    )
  )
);

/** Everything the doctor looks at, in the order it prints it. */
export const diagnose = (choice: Option.Option<string>) =>
  Effect.gen(function* diagnosing() {
    const apiUrl = yield* apiUrlCheck;
    const server = yield* serverChecks;
    const withKey = Option.isSome(yield* apiKey);

    const credential = yield* withKey
      ? keyChecks(choice, server.up)
      : personChecks(choice, server.up);

    const checks: readonly Check[] = [
      apiUrl,
      ...server.checks,
      ...credential,
      yield* mcpCheck,
    ];

    return { checks, ok: checks.every(({ status }) => status !== "failing") };
  });

const lines = (checks: readonly Check[]): readonly string[] => {
  const rows = columns(
    checks.map(({ detail, name, status }) => [status, name, detail])
  );

  return checks.flatMap(({ fix }, index) => [
    rows[index] ?? "",
    ...(fix === undefined ? [] : [`    To do: ${fix}`]),
  ]);
};

export const doctor = Command.make(
  "doctor",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("doctor")(function* doctor({ json, workspace: choice }) {
    const diagnosis = yield* diagnose(choice);

    if (json) {
      yield* printJson(DiagnosisSchema, diagnosis);
    } else {
      for (const line of lines(diagnosis.checks)) {
        yield* Console.log(line);
      }
    }

    const failed = diagnosis.checks.filter(
      ({ status }) => status === "failing"
    );

    yield* failed.length > 0
      ? Effect.fail(
          new DoctorFailed({
            failed: failed.map(({ name }) => name),
          })
        )
      : Effect.void;
  })
).pipe(
  Command.withShortDescription(
    "Check what this command line runs with: the server, the credential and the workspace. It changes nothing."
  ),
  Command.withDescription(
    `Check what this command line runs with, and change nothing: the API URL and where it came from, that the server answers and is ready, its API's latest release, which credential is used (${apiKeyVariable} or the saved sign-in, never printed), that it works, whether it may schedule and publish, whether it may work with ads, which workspace commands act in, and the MCP endpoint. Each check is ok, failing or skipped, with what to do. Exits with 1 when one fails. With --json: {"checks": [{"name", "status", "detail", "fix"}], "ok"}.`
  )
);
