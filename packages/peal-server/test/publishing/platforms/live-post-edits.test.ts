import { assert, describe, it } from "@effect/vitest";
import { Context, Effect, Layer, Option, Schema } from "effect";

import type { PendingEdit } from "#publishing/application/live-post-edits.ts";
import { LivePostChangeIdSchema } from "#publishing/domain/live-post-change-id.ts";
import { MastodonOptions } from "#publishing/domain/mastodon-options.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import {
  businessLocationPath,
  fakeGoogleBusinessApi,
} from "#test/publishing/fakes/fake-google-business-api.ts";
import {
  fakeMastodonInstance,
  mastodonAccountId,
} from "#test/publishing/fakes/fake-mastodon-instance.ts";
import type { FakeMastodonOptions } from "#test/publishing/fakes/fake-mastodon-instance.ts";
import { json, jsonBodyOf } from "#test/publishing/fakes/platform-server.ts";
import type { PlatformServer } from "#test/publishing/fakes/platform-server.ts";

import {
  attached,
  CredentialLog,
  credentialsOf,
  googleBusinessClientWith,
  liveClientsOn,
  mastodonClientWith,
  outgoing,
  testFile,
} from "./support.ts";
import type { TestFile } from "./support.ts";

// Editing the text of posts live on each platform, against the loopback
// fakes, as the gates' EditLivePost calls do: the call names the change,
// whose text and options the gate's side reads.

const channelId = ChannelIdSchema.make("00000000-0000-7000-8000-0000000000c1");

const changeId = LivePostChangeIdSchema.make(
  "00000000-0000-7000-8000-0000000000e1"
);

const idOf = (result: PublishResult) =>
  result._tag === "published"
    ? Effect.succeed(result.platformPostId)
    : Effect.die(`The post was not published: ${result._tag}`);

const callsOf = (server: PlatformServer, method: string) =>
  server.requests().filter((request) => request.method === method);

const readBody = jsonBodyOf(Schema.Json);

// The body of the first request sent with `method`, as JSON.
const bodyOf = (server: PlatformServer, method: string) => {
  const [call] = callsOf(server, method);

  return call === undefined ? undefined : readBody(call);
};

const failureOf = <A, E>(effect: Effect.Effect<A, E>) =>
  effect.pipe(Effect.flip);

const warned = new MastodonOptions({
  contentWarning: "A synthetic warning",
  language: "en",
  sensitive: true,
});

describe("editing posts on Mastodon", () => {
  const onInstance = Effect.fn("test.onInstance")(function* onInstance(
    edit: PendingEdit,
    given: {
      readonly files?: readonly TestFile[];
      readonly instance?: FakeMastodonOptions;
      readonly tokens?: readonly string[];
    } = {}
  ) {
    const instance = yield* fakeMastodonInstance(given.instance);
    const accountId = mastodonAccountId(instance.url);

    const credentials = yield* Layer.build(
      credentialsOf(
        { accountId, platform: "mastodon" },
        given.tokens ?? ["token-1"]
      )
    );

    const client = yield* mastodonClientWith({
      credentials: Layer.succeedContext(credentials),
      files: given.files ?? [],
    });

    const live = yield* liveClientsOn({
      credentials: Layer.succeedContext(credentials),
      edits: new Map([[changeId, edit]]),
      platforms: {},
    });

    return {
      accountId,
      client,
      instance,
      live,
      log: Context.get(credentials, CredentialLog),
    };
  });

  it.live(
    "replaces the text, sending its media, warning and sensitivity again as Mastodon has them",
    () =>
      Effect.gen(function* edits() {
        const image = testFile("image", 2048);

        const { accountId, client, instance, live } = yield* onInstance(
          { options: Option.some(warned), text: "A corrected synthetic post" },
          { files: [image] }
        );

        const platformPostId = yield* idOf(
          yield* client.publish(
            yield* outgoing({
              accountId,
              media: [attached(image, "A red square")],
              options: Option.some(warned),
            })
          )
        );

        const [before] = instance.statuses();

        assert.strictEqual(
          yield* live.edit({ changeId, channelId, platformPostId }),
          "edited"
        );

        const [after] = instance.statuses();

        assert.strictEqual(after?.text, "A corrected synthetic post");
        assert.deepStrictEqual(after?.mediaIds, before?.mediaIds);
        assert.lengthOf(after?.mediaIds ?? [], 1);
        assert.strictEqual(after?.spoilerText, "A synthetic warning");
        assert.isTrue(after?.sensitive);
        assert.strictEqual(after?.language, "en");
        assert.strictEqual(after?.edits, 1);

        // Read first, then written, at the status's own address.
        assert.deepStrictEqual(
          instance
            .requests()
            .filter(({ path }) => path.startsWith("/api/v1/statuses/"))
            .map(({ method, path }) => `${method} ${path}`),
          [
            `GET /api/v1/statuses/${platformPostId}`,
            `PUT /api/v1/statuses/${platformPostId}`,
          ]
        );
        assert.deepStrictEqual(bodyOf(instance, "PUT"), {
          media_ids: [...(before?.mediaIds ?? [])],
          sensitive: true,
          spoiler_text: "A synthetic warning",
          status: "A corrected synthetic post",
        });

        // The same text again changes nothing but the count of edits.
        assert.strictEqual(
          yield* live.edit({ changeId, channelId, platformPostId }),
          "edited"
        );
        assert.strictEqual(
          instance.statuses()[0]?.text,
          "A corrected synthetic post"
        );
      }).pipe(Effect.scoped)
  );

  it.live("keeps the status's own warning when the options hold none", () =>
    Effect.gen(function* ownWarning() {
      const { accountId, client, instance, live } = yield* onInstance({
        options: Option.none(),
        text: "Corrected",
      });

      const platformPostId = yield* idOf(
        yield* client.publish(
          yield* outgoing({ accountId, options: Option.some(warned) })
        )
      );

      yield* live.edit({ changeId, channelId, platformPostId });

      const [after] = instance.statuses();

      assert.strictEqual(after?.spoilerText, "A synthetic warning");
      assert.isTrue(after?.sensitive);
      // A language left out is kept by Mastodon, and not sent.
      assert.strictEqual(after?.language, "en");
      assert.notProperty(bodyOf(instance, "PUT"), "language");
    }).pipe(Effect.scoped)
  );

  it.live(
    "changes the text alone, keeping the warning, sensitivity and language changed on Mastodon since",
    () =>
      Effect.gen(function* changedThere() {
        const { accountId, client, instance, live } = yield* onInstance({
          options: Option.some(warned),
          text: "Corrected",
        });

        const platformPostId = yield* idOf(
          yield* client.publish(
            yield* outgoing({ accountId, options: Option.some(warned) })
          )
        );

        instance.changeOnMastodon(platformPostId, {
          language: "fr",
          sensitive: false,
          spoilerText: "",
        });

        yield* live.edit({ changeId, channelId, platformPostId });

        const [after] = instance.statuses();

        assert.strictEqual(after?.text, "Corrected");
        assert.strictEqual(after?.spoilerText, "");
        assert.isFalse(after?.sensitive);
        assert.strictEqual(after?.language, "fr");
        assert.notProperty(bodyOf(instance, "PUT"), "language");
      }).pipe(Effect.scoped)
  );

  it.live(
    "asks Mastodon whether the token still works before taking a status as gone",
    () =>
      Effect.gen(function* notRecognised() {
        const { instance, live } = yield* onInstance({
          options: Option.none(),
          text: "Corrected",
        });

        const platformPostId = PlatformPostIdSchema.make("110000098");

        // A followers-only status answers 404 to a token Mastodon no
        // longer recognises, as to one that never existed.
        instance.script("GET /api/v1/statuses/:id", [
          json({ error: "Record not found" }, 404),
          json({ error: "Record not found" }, 404),
        ]);
        instance.revokeTokens();

        const failure = yield* failureOf(
          live.edit({ changeId, channelId, platformPostId })
        );

        assert.notDeepEqual(failure, new BadRequest({ code: "postGone" }));
        assert.isTrue(
          instance
            .requests()
            .some(({ path }) => path === "/api/v1/accounts/verify_credentials")
        );
        assert.lengthOf(callsOf(instance, "PUT"), 0);
      }).pipe(Effect.scoped)
  );

  it.live("refuses a status with a poll before changing anything", () =>
    Effect.gen(function* poll() {
      const { accountId, client, instance, live } = yield* onInstance({
        options: Option.none(),
        text: "Corrected",
      });

      const platformPostId = yield* idOf(
        yield* client.publish(yield* outgoing({ accountId }))
      );

      instance.addPoll(platformPostId);

      assert.deepStrictEqual(
        yield* failureOf(live.edit({ changeId, channelId, platformPostId })),
        new BadRequest({ code: "pollNotEditable" })
      );
      assert.lengthOf(callsOf(instance, "PUT"), 0);
      assert.isTrue(instance.statuses()[0]?.poll);
    }).pipe(Effect.scoped)
  );

  it.live(
    "takes a status gone as gone, and a 404 that is not Mastodon's as the instance unreachable",
    () =>
      Effect.gen(function* gone() {
        const { instance, live } = yield* onInstance({
          options: Option.none(),
          text: "Corrected",
        });

        const platformPostId = PlatformPostIdSchema.make("110000099");

        assert.deepStrictEqual(
          yield* failureOf(live.edit({ changeId, channelId, platformPostId })),
          new BadRequest({ code: "postGone" })
        );

        instance.script("GET /api/v1/statuses/:id", [
          { _tag: "answer", status: 404 },
        ]);

        assert.deepStrictEqual(
          yield* failureOf(live.edit({ changeId, channelId, platformPostId })),
          new PlatformUnavailable()
        );
        assert.lengthOf(callsOf(instance, "PUT"), 0);
      }).pipe(Effect.scoped)
  );

  it.live("refuses a token without read:statuses as a permission", () =>
    Effect.gen(function* scopes() {
      const { accountId, client, instance, live, log } = yield* onInstance(
        { options: Option.none(), text: "Corrected" },
        { instance: { readStatuses: false } }
      );

      const platformPostId = yield* idOf(
        yield* client.publish(yield* outgoing({ accountId }))
      );

      assert.deepStrictEqual(
        yield* failureOf(live.edit({ changeId, channelId, platformPostId })),
        new BadRequest({ code: "permissionDenied" })
      );
      assert.lengthOf(callsOf(instance, "PUT"), 0);
      assert.strictEqual(yield* log.renewals, 0);
    }).pipe(Effect.scoped)
  );

  it.live("renews a refused token once", () =>
    Effect.gen(function* renews() {
      const { accountId, client, instance, live, log } = yield* onInstance(
        { options: Option.none(), text: "Corrected" },
        { tokens: ["token-1", "token-2"] }
      );

      const platformPostId = yield* idOf(
        yield* client.publish(yield* outgoing({ accountId }))
      );

      instance.revokeTokens();
      instance.allowToken("token-2");

      assert.strictEqual(
        yield* live.edit({ changeId, channelId, platformPostId }),
        "edited"
      );
      assert.strictEqual(yield* log.renewals, 1);
    }).pipe(Effect.scoped)
  );

  it.live(
    "sends nothing for a change that ended, or an id not Mastodon's",
    () =>
      Effect.gen(function* nothing() {
        const { instance, live } = yield* onInstance({
          options: Option.none(),
          text: "Corrected",
        });

        assert.deepStrictEqual(
          yield* failureOf(
            live.edit({
              changeId: LivePostChangeIdSchema.make(
                "00000000-0000-7000-8000-0000000000e9"
              ),
              channelId,
              platformPostId: PlatformPostIdSchema.make("1"),
            })
          ),
          new BadRequest({ code: "changeEnded" })
        );
        assert.deepStrictEqual(
          yield* failureOf(
            live.edit({
              changeId,
              channelId,
              platformPostId: PlatformPostIdSchema.make("../accounts"),
            })
          ),
          new BadRequest({ code: "invalidPlatformId" })
        );
        assert.lengthOf(instance.requests(), 0);
      }).pipe(Effect.scoped)
  );
});

describe("editing posts on Google Business Profile", () => {
  it.live("patches the summary alone, naming it in the mask", () =>
    Effect.gen(function* patches() {
      const google = yield* fakeGoogleBusinessApi();

      const credentials = Layer.succeedContext(
        yield* Layer.build(
          credentialsOf(
            { accountId: businessLocationPath, platform: "googleBusiness" },
            ["ya29.business-1"]
          )
        )
      );

      const client = yield* googleBusinessClientWith({
        api: google.url,
        credentials,
        files: [],
      });

      const live = yield* liveClientsOn({
        credentials,
        edits: new Map([
          [changeId, { options: Option.none(), text: "Corrected summary" }],
        ]),
        platforms: { googleBusinessApi: new URL(google.url) },
      });

      const platformPostId = yield* idOf(
        yield* client.publish(
          yield* outgoing({ accountId: businessLocationPath })
        )
      );

      const [made] = google.posts();

      assert.strictEqual(
        yield* live.edit({ changeId, channelId, platformPostId }),
        "edited"
      );

      const [call] = callsOf(google, "PATCH");

      assert.strictEqual(call?.path, `/v4/${platformPostId}`);
      assert.strictEqual(call?.query.get("updateMask"), "summary");
      assert.strictEqual(
        call?.headers["authorization"],
        "Bearer ya29.business-1"
      );
      assert.deepStrictEqual(bodyOf(google, "PATCH"), {
        summary: "Corrected summary",
      });

      const [post] = google.posts();

      assert.strictEqual(post?.body.summary, "Corrected summary");
      assert.deepStrictEqual(post?.body, {
        ...made?.body,
        summary: "Corrected summary",
      });

      // A post Google no longer has.
      assert.deepStrictEqual(
        yield* failureOf(
          live.edit({
            changeId,
            channelId,
            platformPostId: PlatformPostIdSchema.make(
              `${businessLocationPath}/localPosts/1`
            ),
          })
        ),
        new BadRequest({ code: "postGone" })
      );

      // Another location's post is not asked for.
      const before = google.requests().length;

      assert.deepStrictEqual(
        yield* failureOf(
          live.edit({
            changeId,
            channelId,
            platformPostId: PlatformPostIdSchema.make(
              "accounts/200000000000000001/locations/999/localPosts/1"
            ),
          })
        ),
        new BadRequest({ code: "invalidPlatformId" })
      );
      assert.strictEqual(google.requests().length, before);
    }).pipe(Effect.scoped)
  );
});
