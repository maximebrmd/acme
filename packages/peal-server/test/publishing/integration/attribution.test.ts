import { assert, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { PostSchema } from "peal-contract";

import {
  apiKeyOf,
  bodyOf,
  IntegrationLive,
  signedUp,
  TestApp,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";

// How a post says it was created, through the server as it runs: the web
// app for a session, and the API key, by id and name, for a key.

const PostJsonSchema = Schema.toCodecJson(PostSchema);

const draft = (text: string) => ({
  channelIds: [],
  content: { media: [], overrides: [], text },
});

layer(IntegrationLive, { excludeTestServices: true, timeout: "120 seconds" })(
  "a post's origin",
  (it) => {
    it.effect("is the web app for a member, and the key for an API key", () =>
      Effect.gen(function* origins() {
        const app = yield* TestApp;
        const owner = yield* signedUp("attribution-owner");
        const workspaceId = yield* workspaceOf(owner, "Attribution");
        const posts = `/api/workspaces/${workspaceId}/posts`;

        const inSession = yield* bodyOf(
          PostJsonSchema,
          yield* app.request(posts, {
            body: draft("A synthetic draft written in the web app."),
            headers: { cookie: owner.cookies },
          })
        );

        assert.strictEqual(inSession.authorId, owner.id);
        assert.deepStrictEqual(inSession.createdVia, {
          id: null,
          name: null,
          via: "web",
        });
        assert.isNull(inSession.scheduledVia);
        assert.isNull(inSession.scheduledBy);

        const { apiKey, key } = yield* apiKeyOf(owner, workspaceId, [
          "post:create",
          "post:read",
          "channel:read",
        ]);

        const withKey = yield* bodyOf(
          PostJsonSchema,
          yield* app.request(posts, {
            body: draft("A synthetic draft written by a script."),
            headers: { authorization: `Bearer ${key}` },
          })
        );

        assert.isNull(withKey.authorId);
        assert.deepStrictEqual(withKey.createdVia, {
          id: apiKey.id,
          name: "ci",
          via: "apiKey",
        });
      })
    );
  }
);
