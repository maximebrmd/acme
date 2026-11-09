import { Console, Effect } from "effect";
import { Command } from "effect/cli";

import { requestFailed } from "#api-request-failed.ts";
import { AcmeApi } from "#api.ts";
import { display } from "#display.ts";
import { accessToken } from "#session.ts";
import { SignInExpired } from "#sign-in-expired.ts";

export const whoami = Command.make(
  "whoami",
  {},
  Effect.fn("whoami")(function* whoami() {
    const api = yield* AcmeApi;
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

    yield* Console.log(
      `Signed in to ${url} as ${me.user.name} <${me.user.email}>.`
    );

    if (me.workspaces.length === 0) {
      yield* Console.log("You do not belong to any workspace yet.");

      return;
    }

    yield* Console.log("Workspaces:");

    for (const workspace of me.workspaces) {
      yield* Console.log(`  ${workspace.name} (${workspace.role})`);
    }
  })
).pipe(
  Command.withDescription(
    "Show who the command line is signed in as, and the workspaces they belong to."
  )
);
