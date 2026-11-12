// The workspace's short links default through the whole server: a new
// post that does not say takes it when it is made, one that says keeps its
// own choice, and a server without short links shortens nothing whatever
// the default.
import { assert, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";

import {
  bodyOf,
  signedUp,
  TestApp,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";
import type { Person } from "#test/workspace/integration/harness.ts";

const base = "https://go.example.com/";

const ShortenSchema = Schema.Struct({ shortenLinks: Schema.Boolean });

const draft = {
  channelIds: [],
  content: {
    media: [],
    overrides: [],
    text: "A synthetic draft https://example.com/a-long-page",
  },
};

// The owner turns the workspace's default on.
const defaultOn = Effect.fn("defaultOn")(function* defaultOn(
  owner: Person,
  workspaceId: string
) {
  const app = yield* TestApp;

  const set = yield* app.request(
    `/api/workspaces/${workspaceId}/short-links/settings`,
    {
      body: { byDefault: true },
      headers: { cookie: owner.cookies },
      method: "PUT",
    }
  );

  assert.strictEqual(set.status, 200);
});

// Whether the draft made with these fields asks for short links.
const madeWith = Effect.fn("madeWith")(function* madeWith(
  owner: Person,
  workspaceId: string,
  fields: { readonly shortenLinks?: boolean } = {}
) {
  const app = yield* TestApp;

  const made = yield* app.request(`/api/workspaces/${workspaceId}/posts`, {
    body: { ...draft, ...fields },
    headers: { cookie: owner.cookies },
  });

  assert.strictEqual(made.status, 201);

  return (yield* bodyOf(ShortenSchema, made)).shortenLinks;
});

layer(TestApp.layerWith({ PEAL_SHORT_LINK_BASE: base }), {
  excludeTestServices: true,
  timeout: "180 seconds",
})("a server with short links", (it) => {
  it.effect(
    "makes a post that does not say as the workspace's default says",
    () =>
      Effect.gen(function* withDefault() {
        const owner = yield* signedUp("short-default-owner");
        const workspaceId = yield* workspaceOf(owner, "Short default");

        assert.isFalse(yield* madeWith(owner, workspaceId));

        yield* defaultOn(owner, workspaceId);

        assert.isTrue(yield* madeWith(owner, workspaceId));
        assert.isFalse(
          yield* madeWith(owner, workspaceId, { shortenLinks: false })
        );
      })
  );
});

layer(TestApp.layer, { excludeTestServices: true, timeout: "180 seconds" })(
  "a server without short links",
  (it) => {
    it.effect("makes a post that does not say without them", () =>
      Effect.gen(function* withoutBase() {
        const owner = yield* signedUp("short-default-off");
        const workspaceId = yield* workspaceOf(owner, "No short links");

        yield* defaultOn(owner, workspaceId);

        assert.isFalse(yield* madeWith(owner, workspaceId));
      })
    );
  }
);
