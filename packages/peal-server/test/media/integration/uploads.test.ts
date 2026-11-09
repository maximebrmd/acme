// Uploads through the whole server, as a browser and a script do them: the
// API signs the requests, the file goes straight to the development stack's
// SeaweedFS, and the API completes and probes it. People sign in with Better
// Auth, so these tests read their confirmation emails from Mailpit.
import { assert, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";
import sharp from "sharp";

import { mebibytes, sendSigned, syntheticBytes } from "#test/media/support.ts";
import {
  apiKeyOf,
  bodyOf,
  IntegrationLive,
  signedUp,
  TestApp,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";

const SignedRequestSchema = Schema.Struct({
  headers: Schema.Record(Schema.String, Schema.String),
  method: Schema.Literal("PUT"),
  url: Schema.String,
});

const MediaSchema = Schema.Struct({
  byteSize: Schema.Int,
  id: Schema.String,
  status: Schema.Struct({ _tag: Schema.String }),
  url: Schema.NullOr(Schema.String),
});

const PreparedSchema = Schema.Struct({
  media: MediaSchema,
  upload: Schema.Union([
    Schema.Struct({
      _tag: Schema.Literal("single"),
      request: SignedRequestSchema,
    }),
    Schema.Struct({
      _tag: Schema.Literal("multipart"),
      partSize: Schema.Int,
      parts: Schema.Array(
        Schema.Struct({
          byteSize: Schema.Int,
          partNumber: Schema.Int,
          request: SignedRequestSchema,
        })
      ),
    }),
  ]),
});

const PageSchema = Schema.Struct({ items: Schema.Array(MediaSchema) });

const ReadySchema = Schema.Struct({
  altText: Schema.String,
  dimensions: Schema.Struct({ height: Schema.Int, width: Schema.Int }),
  status: Schema.Struct({ _tag: Schema.Literal("ready") }),
  url: Schema.String,
});

const UploadedSchema = Schema.Struct({
  status: Schema.Struct({
    _tag: Schema.Literal("uploaded"),
    probe: Schema.String,
  }),
  url: Schema.String,
});

const whiteWebp = Effect.promise(
  async () =>
    new Uint8Array(
      await sharp({
        create: { background: "#ffffff", channels: 3, height: 8, width: 8 },
      })
        .webp()
        .toBuffer()
    )
);

/** The bytes at a URL, as the browser showing the media reads them. */
const download = (url: string) =>
  Effect.promise(async () => {
    const response = await fetch(url);

    return new Uint8Array(await response.arrayBuffer());
  });

layer(IntegrationLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "uploads through the API",
  (it) => {
    it.effect(
      "take an image from a signed-in member in one request, then delete it",
      () =>
        Effect.gen(function* single() {
          const app = yield* TestApp;
          const owner = yield* signedUp("camille");
          const workspaceId = yield* workspaceOf(owner, "Studio");
          const headers = { cookie: owner.cookies };
          const base = `/api/workspaces/${workspaceId}/media`;
          const body = yield* whiteWebp;

          const created = yield* app.request(base, {
            body: {
              altText: "A white square",
              byteSize: body.length,
              contentType: "image/webp",
            },
            headers,
          });

          assert.strictEqual(created.status, 201);

          const prepared = yield* bodyOf(PreparedSchema, created);
          const { upload } = prepared;

          assert.strictEqual(upload._tag, "single");

          if (upload._tag === "single") {
            const stored = yield* sendSigned(upload.request, body);

            assert.strictEqual(stored.status, 200);
          }

          const media = `${base}/${prepared.media.id}`;

          const completed = yield* app.request(`${media}/complete`, {
            headers,
            method: "POST",
          });

          assert.strictEqual(completed.status, 200);

          const ready = yield* bodyOf(ReadySchema, completed);

          assert.deepStrictEqual(ready.dimensions, { height: 8, width: 8 });
          assert.strictEqual(ready.altText, "A white square");
          assert.deepStrictEqual(yield* download(ready.url), body);

          const listed = yield* bodyOf(
            PageSchema,
            yield* app.request(base, { headers })
          );

          assert.deepStrictEqual(
            listed.items.map(({ id, status }) => [id, status._tag]),
            [[prepared.media.id, "ready"]]
          );

          const deleted = yield* app.request(media, {
            headers,
            method: "DELETE",
          });

          assert.strictEqual(deleted.status, 204);
          assert.strictEqual(
            (yield* app.request(media, { headers })).status,
            404
          );
        })
    );

    it.effect(
      "take a large video from an API key in parts, sent at once and again",
      () =>
        Effect.gen(function* multipart() {
          const app = yield* TestApp;
          const owner = yield* signedUp("noor");
          const workspaceId = yield* workspaceOf(owner, "Atelier");

          const { key } = yield* apiKeyOf(owner, workspaceId, [
            "media:read",
            "media:upload",
            "media:delete",
          ]);

          const headers = { authorization: `Bearer ${key}` };
          const base = `/api/workspaces/${workspaceId}/media`;
          const body = syntheticBytes(mebibytes(17) + 123);

          const prepared = yield* bodyOf(
            PreparedSchema,
            yield* app.request(base, {
              body: { byteSize: body.length, contentType: "video/mp4" },
              headers,
            })
          );

          const upload =
            prepared.upload._tag === "multipart"
              ? prepared.upload
              : yield* Effect.die("expected a multipart upload");

          assert.deepStrictEqual(
            upload.parts.map(({ byteSize, partNumber }) => [
              partNumber,
              byteSize,
            ]),
            [
              [1, mebibytes(8)],
              [2, mebibytes(8)],
              [3, mebibytes(1) + 123],
            ]
          );

          const slice = (partNumber: number, byteSize: number) => {
            const start = (partNumber - 1) * upload.partSize;

            return body.slice(start, start + byteSize);
          };

          // Every part at once, the last one first; then the first one again,
          // as a client does when it did not see the store's answer.
          const statuses = yield* Effect.forEach(
            upload.parts.toReversed(),
            (part) =>
              sendSigned(part.request, slice(part.partNumber, part.byteSize)),
            { concurrency: "unbounded" }
          );

          const [first] = upload.parts;

          if (first !== undefined) {
            statuses.push(
              yield* sendSigned(
                first.request,
                slice(first.partNumber, first.byteSize)
              )
            );
          }

          assert.deepStrictEqual(
            statuses.map((response) => response.status),
            [200, 200, 200, 200]
          );

          const completed = yield* app.request(
            `${base}/${prepared.media.id}/complete`,
            { headers, method: "POST" }
          );

          assert.strictEqual(completed.status, 200);

          // Synthetic bytes, not a video: ffprobe cannot read them, or is not
          // installed. Either way the file is stored, whole.
          const uploaded = yield* bodyOf(UploadedSchema, completed);

          assert.include(["unreadable", "unavailable"], uploaded.status.probe);
          assert.deepStrictEqual(yield* download(uploaded.url), body);

          const deleted = yield* app.request(`${base}/${prepared.media.id}`, {
            headers,
            method: "DELETE",
          });

          assert.strictEqual(deleted.status, 204);
        })
    );
  }
);
