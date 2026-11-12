import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import { studioMe } from "./studio.ts";

// A workspace whose owners require two-step verification, for a user whose
// account does not have it on: the server refuses every command there, and
// the command line says what to do, which the command line itself cannot.

const requiring = {
  ...studioMe,
  workspaces: studioMe.workspaces.map((workspace) =>
    workspace.slug === "shop"
      ? { ...workspace, twoStepRequired: true }
      : workspace
  ),
};

describe("a workspace that requires two-step verification", () => {
  it.effect(
    "is refused with what to do, and with --json as the server said",
    () =>
      Effect.gen(function* refused() {
        const session = yield* signedIn({ me: requiring });

        assert.include(
          yield* session.refused(["channels", "list", "--workspace", "shop"]),
          "This workspace requires two-step verification. Turn it on at http://localhost:3000/app/account, then run the command again."
        );

        assert.deepStrictEqual(
          JSON.parse(
            yield* session.refused([
              "channels",
              "list",
              "--json",
              "--workspace",
              "shop",
            ])
          ),
          {
            error: {
              _tag: "Forbidden",
              code: "forbidden",
              message:
                "This workspace requires two-step verification. Turn it on in your Peal account settings, then try again.",
              reason: "twoStepRequired",
            },
          }
        );

        // The other workspace answers as before.
        yield* session.printed(["channels", "list", "--workspace", "studio"]);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
