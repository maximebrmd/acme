import { assert, layer } from "@effect/vitest";
import {
  Api,
  Forbidden,
  MediaNotFound,
  MediaStoreUnavailable,
  UploadIncomplete,
  UploadRejected,
} from "acme-contract";
import type { Member, PreparedUpload } from "acme-contract";
import { ConfigProvider, Effect, Layer, Logger } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiError, HttpApiTest } from "effect/http-api";
import sharp from "sharp";

import { MediaApiLive, MediaLive } from "#media/container.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import { Ids } from "#shared/application/ids.ts";
import type { Permission } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import {
  damagedPng,
  DatabaseTest,
  mebibytes,
  sendSigned,
  storageSettings,
  syntheticSvg,
} from "#test/media/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The media endpoints on the real use cases, Postgres and SeaweedFS. Each
// request acts as a member, as the WorkspaceAccess middleware would.
const UseCasesTest = Layer.mergeAll(MediaLive, S3MediaStorageLive).pipe(
  Layer.provideMerge(DatabaseTest),
  Layer.provide(storageSettings)
);

// The same, on a store that answers nothing: no server listens on the
// loopback's port 9.
const UnreachableStoreTest = MediaLive.pipe(
  Layer.provideMerge(DatabaseTest),
  Layer.provide(storageSettings),
  Layer.provide(
    ConfigProvider.layerAdd(
      ConfigProvider.fromUnknown({ ACME_S3_ENDPOINT: "http://127.0.0.1:9" }),
      { asPrimary: true }
    )
  )
);

const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["media"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        MediaApiLive.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const freshWorkspace: Effect.Effect<WorkspaceId, never, Ids> = Ids.use(
  (ids) => ids.next
).pipe(Effect.map((uuid) => WorkspaceIdSchema.make(uuid)));

const as = (role: "contributor" | "owner" | "viewer") =>
  Effect.gen(function* member() {
    const workspaceId = yield* freshWorkspace;

    return {
      client: yield* clientAs(memberOf(workspaceId, permissionsFor(role))),
      workspaceId,
    };
  });

const withPermissions = (
  workspaceId: WorkspaceId,
  permissions: readonly Permission[]
) => clientAs(memberOf(workspaceId, permissions));

type Client = Effect.Success<ReturnType<typeof clientAs>>;

const whitePng = Effect.promise(
  async () =>
    new Uint8Array(
      await sharp({
        create: { background: "#ffffff", channels: 3, height: 3, width: 4 },
      })
        .png()
        .toBuffer()
    )
);

// Starts an upload whose file goes with the test.
const started = Effect.fn("started")(function* started(
  client: Client,
  workspaceId: WorkspaceId,
  payload: { readonly byteSize: number; readonly contentType: string }
) {
  const prepared = yield* client.media.create({
    params: { workspaceId },
    payload,
  });

  yield* Effect.addFinalizer(() =>
    client.media
      .delete({ params: { mediaId: prepared.media.id, workspaceId } })
      .pipe(Effect.ignore)
  );

  return prepared;
});

const singleRequest = (prepared: PreparedUpload) =>
  prepared.upload._tag === "single"
    ? Effect.succeed(prepared.upload.request)
    : Effect.die("expected a single upload");

layer(UseCasesTest)("the media endpoints", (it) => {
  it.effect("upload an image, then show, list and delete it", () =>
    Effect.gen(function* uploads() {
      const { client, workspaceId } = yield* as("owner");
      const body = yield* whitePng;

      const prepared = yield* started(client, workspaceId, {
        byteSize: body.length,
        contentType: "image/png",
      });

      const mediaId = prepared.media.id;
      const params = { mediaId, workspaceId };

      assert.deepStrictEqual(prepared.media.status, { _tag: "pending" });
      assert.isNull(prepared.media.url);

      const stored = yield* sendSigned(yield* singleRequest(prepared), body);

      assert.strictEqual(stored.status, 200);

      const ready = yield* client.media.complete({ params });

      assert.deepStrictEqual(ready.status, { _tag: "ready" });
      assert.deepStrictEqual(ready.dimensions, { height: 3, width: 4 });
      assert.isString(ready.url);

      assert.deepStrictEqual(
        (yield* client.media.get({ params })).dimensions,
        ready.dimensions
      );

      const page = yield* client.media.list({
        params: { workspaceId },
        query: {},
      });

      assert.deepStrictEqual(
        page.items.map(({ id }) => id),
        [mediaId]
      );
      assert.isNull(page.nextCursor);

      const response = yield* client.media.delete({
        params,
        responseMode: "response-only",
      });

      assert.strictEqual(response.status, 204);
      assert.instanceOf(
        yield* Effect.flip(client.media.get({ params })),
        MediaNotFound
      );
    })
  );

  it.effect("answer 201 to a new upload, with no store internals", () =>
    Effect.gen(function* created() {
      const { client, workspaceId } = yield* as("contributor");

      const response = yield* client.media.create({
        params: { workspaceId },
        payload: { byteSize: 10, contentType: "image/png" },
        responseMode: "response-only",
      });

      assert.strictEqual(response.status, 201);

      const text = yield* response.text;

      assert.notInclude(text, "storageKey");
      assert.notInclude(text, "uploadId");
    })
  );

  it.effect("answer 409 while the file has not arrived", () =>
    Effect.gen(function* incomplete() {
      const { client, workspaceId } = yield* as("owner");

      const prepared = yield* started(client, workspaceId, {
        byteSize: 10,
        contentType: "image/png",
      });

      const params = { mediaId: prepared.media.id, workspaceId };

      assert.instanceOf(
        yield* Effect.flip(client.media.complete({ params })),
        UploadIncomplete
      );

      const response = yield* client.media.complete({
        params,
        responseMode: "response-only",
      });

      assert.strictEqual(response.status, 409);
    })
  );

  it.effect("reject a file that is not of the declared type", () =>
    Effect.gen(function* rejects() {
      const { client, workspaceId } = yield* as("owner");
      const body = syntheticSvg();

      const prepared = yield* started(client, workspaceId, {
        byteSize: body.length,
        contentType: "image/png",
      });

      const params = { mediaId: prepared.media.id, workspaceId };

      yield* sendSigned(yield* singleRequest(prepared), body);

      const error = yield* Effect.flip(client.media.complete({ params }));

      assert.instanceOf(error, UploadRejected);
      assert.include(error, { reason: "typeMismatch" });
      assert.deepStrictEqual((yield* client.media.get({ params })).status, {
        _tag: "rejected",
        reason: "typeMismatch",
      });
    })
  );

  it.effect("keep a damaged file uploaded, saying why", () =>
    Effect.gen(function* damaged() {
      const { client, workspaceId } = yield* as("owner");
      const body = damagedPng(64);

      const prepared = yield* started(client, workspaceId, {
        byteSize: body.length,
        contentType: "image/png",
      });

      yield* sendSigned(yield* singleRequest(prepared), body);

      const uploaded = yield* client.media.complete({
        params: { mediaId: prepared.media.id, workspaceId },
      });

      assert.deepStrictEqual(uploaded.status, {
        _tag: "uploaded",
        probe: "unreadable",
      });
      assert.isString(uploaded.url);
    })
  );

  it.effect.each([
    {
      error: "UnsupportedMediaType",
      label: "a type Acme does not store",
      payload: { byteSize: 10, contentType: "image/svg+xml" },
    },
    {
      error: "MediaTooLarge",
      label: "an image over 16 MiB",
      payload: { byteSize: 16 * 1024 * 1024 + 1, contentType: "image/png" },
    },
    {
      error: "AltTextTooLong",
      label: "a description over 2,000 characters",
      payload: {
        altText: "a".repeat(2001),
        byteSize: 10,
        contentType: "image/png",
      },
    },
  ])("answer 422 to $label", ({ error, payload }) =>
    Effect.gen(function* refused() {
      const { client, workspaceId } = yield* as("owner");
      const params = { workspaceId };

      assert.strictEqual(
        (yield* Effect.flip(client.media.create({ params, payload })))._tag,
        error
      );

      const response = yield* client.media.create({
        params,
        payload,
        responseMode: "response-only",
      });

      assert.strictEqual(response.status, 422);

      const page = yield* client.media.list({ params, query: {} });

      assert.deepStrictEqual(page.items, []);
    })
  );

  it.effect("describe media while it uploads, and clear it", () =>
    Effect.gen(function* describes() {
      const { client, workspaceId } = yield* as("contributor");

      const prepared = yield* client.media.create({
        params: { workspaceId },
        payload: {
          altText: "  A white rectangle ",
          byteSize: 10,
          contentType: "image/png",
        },
      });

      const params = { mediaId: prepared.media.id, workspaceId };

      assert.strictEqual(prepared.media.altText, "A white rectangle");

      const described = yield* client.media.describe({
        params,
        payload: { altText: "A white rectangle, four by three" },
      });

      assert.strictEqual(described.altText, "A white rectangle, four by three");
      assert.deepStrictEqual(described.status, { _tag: "pending" });

      const cleared = yield* client.media.describe({
        params,
        payload: { altText: null },
      });

      assert.isNull(cleared.altText);
    })
  );

  it.effect("list media newest first, a page at a time", () =>
    Effect.gen(function* pages() {
      const { client, workspaceId } = yield* as("owner");
      const params = { workspaceId };
      const ids: string[] = [];

      for (let count = 0; count < 3; count += 1) {
        const prepared = yield* client.media.create({
          params,
          payload: { byteSize: 10, contentType: "image/png" },
        });

        ids.unshift(prepared.media.id);
      }

      const first = yield* client.media.list({ params, query: { limit: 2 } });

      assert.deepStrictEqual(
        first.items.map(({ id }) => id),
        ids.slice(0, 2)
      );
      assert.isString(first.nextCursor);

      const second = yield* client.media.list({
        params,
        query: { cursor: first.nextCursor ?? "", limit: 2 },
      });

      assert.deepStrictEqual(
        second.items.map(({ id }) => id),
        ids.slice(2)
      );
      assert.isNull(second.nextCursor);

      assert.instanceOf(
        yield* Effect.flip(
          client.media.list({ params, query: { cursor: "not-a-cursor" } })
        ),
        HttpApiError.BadRequest
      );
    })
  );

  it.effect("let a viewer read media, and nothing more", () =>
    Effect.gen(function* viewer() {
      const workspaceId = yield* freshWorkspace;

      const owner = yield* withPermissions(
        workspaceId,
        permissionsFor("owner")
      );

      const reader = yield* withPermissions(
        workspaceId,
        permissionsFor("viewer")
      );

      const prepared = yield* owner.media.create({
        params: { workspaceId },
        payload: { byteSize: 10, contentType: "image/png" },
      });

      const params = { mediaId: prepared.media.id, workspaceId };

      assert.deepStrictEqual(
        (yield* reader.media.list({
          params: { workspaceId },
          query: {},
        })).items.map(({ id }) => id),
        [prepared.media.id]
      );
      assert.strictEqual(
        (yield* reader.media.get({ params })).id,
        params.mediaId
      );

      const refusals = [
        yield* Effect.flip(
          reader.media.create({
            params: { workspaceId },
            payload: { byteSize: 10, contentType: "image/png" },
          })
        ),
        yield* Effect.flip(reader.media.complete({ params })),
        yield* Effect.flip(
          reader.media.describe({ params, payload: { altText: "Mine now" } })
        ),
        yield* Effect.flip(reader.media.delete({ params })),
      ];

      for (const refusal of refusals) {
        assert.instanceOf(refusal, Forbidden);
      }

      const response = yield* reader.media.delete({
        params,
        responseMode: "response-only",
      });

      assert.strictEqual(response.status, 403);
      assert.deepStrictEqual(
        (yield* owner.media.get({ params })).altText,
        null
      );
    })
  );

  it.effect("answer 403 to a member without media:read", () =>
    Effect.gen(function* noRead() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* withPermissions(workspaceId, ["post:read"]);

      assert.instanceOf(
        yield* Effect.flip(
          client.media.list({ params: { workspaceId }, query: {} })
        ),
        Forbidden
      );
    })
  );

  it.effect.each([
    { label: "no media", mediaId: "00000000-0000-7000-8000-00000000abcd" },
    { label: "no media id", mediaId: "not-a-media-id" },
  ])("answer 404 for $label", ({ mediaId }) =>
    Effect.gen(function* notFound() {
      const { client, workspaceId } = yield* as("owner");
      const params = { mediaId, workspaceId };

      const failures = [
        yield* Effect.flip(client.media.get({ params })),
        yield* Effect.flip(client.media.complete({ params })),
        yield* Effect.flip(
          client.media.describe({ params, payload: { altText: null } })
        ),
        yield* Effect.flip(client.media.delete({ params })),
      ];

      for (const failure of failures) {
        assert.instanceOf(failure, MediaNotFound);
      }
    })
  );

  it.effect("keep another workspace's media out of reach", () =>
    Effect.gen(function* otherWorkspace() {
      const theirs = yield* as("owner");
      const mine = yield* as("owner");

      const prepared = yield* theirs.client.media.create({
        params: { workspaceId: theirs.workspaceId },
        payload: { byteSize: 10, contentType: "image/png" },
      });

      // The path names their workspace, but the member acts in their own.
      const params = {
        mediaId: prepared.media.id,
        workspaceId: theirs.workspaceId,
      };

      assert.instanceOf(
        yield* Effect.flip(mine.client.media.delete({ params })),
        MediaNotFound
      );
      assert.deepStrictEqual(
        (yield* mine.client.media.list({
          params: { workspaceId: theirs.workspaceId },
          query: {},
        })).items,
        []
      );
      assert.strictEqual(
        (yield* theirs.client.media.get({ params })).id,
        prepared.media.id
      );
    })
  );
});

layer(UnreachableStoreTest)("the media endpoints without a store", (it) => {
  it.effect("answer 503, and log why for whoever runs the server", () =>
    Effect.gen(function* storeDown() {
      const { client, workspaceId } = yield* as("owner");
      const warnings: string[] = [];

      const capture = Logger.layer([
        Logger.make(({ logLevel, message }) => {
          if (logLevel === "Warn") {
            warnings.push(String(message));
          }
        }),
      ]);

      // Signing needs no store, so an image can still be recorded.
      const image = yield* client.media.create({
        params: { workspaceId },
        payload: { byteSize: 10, contentType: "image/png" },
      });

      const params = { mediaId: image.media.id, workspaceId };

      const failures = yield* Effect.all([
        // A large video opens its upload on the store first.
        Effect.flip(
          client.media.create({
            params: { workspaceId },
            payload: { byteSize: mebibytes(20), contentType: "video/mp4" },
          })
        ),
        Effect.flip(client.media.complete({ params })),
        Effect.flip(client.media.delete({ params })),
      ]).pipe(Effect.provide(capture));

      for (const failure of failures) {
        assert.instanceOf(failure, MediaStoreUnavailable);
      }

      assert.lengthOf(warnings, 3);

      for (const [index, operation] of [
        "start a multipart upload",
        "read a file's size and type",
        "delete a file",
      ].entries()) {
        assert.include(warnings[index], "The media store failed");
        assert.include(warnings[index], operation);
      }

      // The media is still there, to complete or delete once the store is
      // back.
      assert.deepStrictEqual((yield* client.media.get({ params })).status, {
        _tag: "pending",
      });
    })
  );
});
