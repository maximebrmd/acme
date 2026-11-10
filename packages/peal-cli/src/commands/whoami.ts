import { Console, Effect } from "effect";
import { Command } from "effect/cli";
import { MeSchema } from "peal-contract";

import { personOnly } from "#api-key.ts";
import { requestFailed } from "#api-request-failed.ts";
import { PealApi } from "#api.ts";
import { display } from "#display.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns } from "#print.ts";
import { accessToken } from "#session.ts";
import { SignInExpired } from "#sign-in-expired.ts";

export const whoami = Command.make(
  "whoami",
  { json: jsonFlag },
  Effect.fn("whoami")(function* whoami({ json }) {
    yield* personOnly("say who it is");

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
  })
).pipe(
  Command.withDescription(
    "Show who the command line is signed in as, and the workspaces they belong to, each with its slug and its id. For a person signed in: an API key is nobody."
  )
);
