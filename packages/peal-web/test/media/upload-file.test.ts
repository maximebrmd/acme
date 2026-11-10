import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Fiber, Latch, Ref } from "effect";
import { TestClock } from "effect/testing";
import type {
  Media,
  NewUpload,
  SignedRequest,
  UploadTarget,
} from "peal-contract";

import { TransferFailed } from "#media/transfer-failed.ts";
import { Transfer } from "#media/transfer.ts";
import { UploadFailed } from "#media/upload-failed.ts";
import { uploadFile } from "#media/upload-file.ts";
import type { UploadApi, UploadEvents } from "#media/upload-file.ts";
import { partConcurrency } from "#media/upload-plan.ts";

const createdAt = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

const mediaId = "00000000-0000-7000-8000-000000000001";

const pending: Media = {
  altText: null,
  byteSize: 0,
  codec: null,
  contentType: "video/mp4",
  createdAt,
  dimensions: null,
  durationMs: null,
  id: mediaId,
  kind: "video",
  pageCount: null,
  status: { _tag: "pending" },
  updatedAt: createdAt,
  url: null,
};

const ready: Media = { ...pending, status: { _tag: "ready" } };

const request = (name: string): SignedRequest => ({
  headers: { "content-type": "video/mp4" },
  method: "PUT",
  url: `https://store.example.test/${name}`,
});

/** `size` bytes that say where they sit in the file. */
const fileOf = (size: number) =>
  new Blob([Uint8Array.from({ length: size }, (_, index) => index % 251)], {
    type: "video/mp4",
  });

const single: UploadTarget = {
  _tag: "single",
  expiresAt: createdAt,
  request: request("file"),
};

// Parts of 5 bytes: the store's minimum is larger, but the client only
// follows the plan.
const inParts = (size: number): UploadTarget => ({
  _tag: "multipart",
  expiresAt: createdAt,
  partSize: 5,
  parts: Array.from({ length: Math.ceil(size / 5) }, (_, index) => ({
    byteSize: Math.min(5, size - index * 5),
    partNumber: index + 1,
    request: request(`part-${index + 1}`),
  })),
});

interface Sent {
  readonly bytes: readonly number[];
  readonly url: string;
}

/**
 * An API that plans `target` and records what it was asked, and a store
 * that answers each request to a URL with the next of its statuses (200
 * once they run out).
 */
const fakes = Effect.fn("fakes")(function* fakes(
  target: UploadTarget,
  statuses: Readonly<Record<string, readonly (number | null)[]>> = {}
) {
  const created = yield* Ref.make<readonly NewUpload[]>([]);
  const completed = yield* Ref.make(0);
  const discarded = yield* Ref.make<readonly string[]>([]);
  const sent = yield* Ref.make<readonly Sent[]>([]);
  const tries = yield* Ref.make<Readonly<Record<string, number>>>({});
  const inFlight = yield* Ref.make(0);
  const mostInFlight = yield* Ref.make(0);

  const api: UploadApi = {
    complete: () =>
      Ref.update(completed, (count) => count + 1).pipe(Effect.as(ready)),
    create: (upload) =>
      Ref.update(created, (all) => [...all, upload]).pipe(
        Effect.as({ media: pending, upload: target })
      ),
    discard: (id) => Ref.update(discarded, (all) => [...all, id]),
  };

  const transfer = Transfer.of({
    put: (signed, body, onProgress) =>
      Effect.gen(function* put() {
        const attempt = (yield* Ref.get(tries))[signed.url] ?? 0;

        yield* Ref.update(tries, (all) => ({
          ...all,
          [signed.url]: attempt + 1,
        }));

        const running = yield* Ref.updateAndGet(inFlight, (count) => count + 1);

        yield* Ref.update(mostInFlight, (most) => Math.max(most, running));

        // Let the other parts start before this one ends.
        yield* Effect.yieldNow;

        const bytes = yield* Effect.promise(async () => [
          ...new Uint8Array(await body.arrayBuffer()),
        ]);

        onProgress(Math.floor(body.size / 2));
        yield* Ref.update(inFlight, (count) => count - 1);

        const status = statuses[signed.url]?.[attempt];

        yield* status === undefined
          ? Ref.update(sent, (all) => [...all, { bytes, url: signed.url }])
          : Effect.fail(new TransferFailed({ status }));
      }),
  });

  return {
    api,
    completed,
    created,
    discarded,
    mostInFlight,
    sent,
    transfer,
    tries,
  };
});

const listening = Effect.gen(function* listening() {
  const progress = yield* Ref.make<readonly number[]>([]);
  const prepared = yield* Ref.make(0);
  const completing = yield* Ref.make(0);

  const events: UploadEvents = {
    onCompleting: () => {
      Effect.runSync(Ref.update(completing, (count) => count + 1));
    },
    onPrepared: () => {
      Effect.runSync(Ref.update(prepared, (count) => count + 1));
    },
    onProgress: (fraction) => {
      Effect.runSync(Ref.update(progress, (all) => [...all, fraction]));
    },
  };

  return { completing, events, prepared, progress };
});

const indices = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, index) => (from + index) % 251);

describe(uploadFile, () => {
  it.effect("sends a small file in one request, then completes it", () =>
    Effect.gen(function* oneRequest() {
      const store = yield* fakes(single);
      const { completing, events, prepared, progress } = yield* listening;

      const media = yield* uploadFile(store.api, fileOf(12), {
        altText: "  A test pattern ",
        events,
      }).pipe(Effect.provideService(Transfer, store.transfer));

      assert.deepStrictEqual(media, ready);
      assert.deepStrictEqual(yield* Ref.get(store.created), [
        { altText: "A test pattern", byteSize: 12, contentType: "video/mp4" },
      ]);
      assert.deepStrictEqual(yield* Ref.get(store.sent), [
        { bytes: indices(0, 12), url: request("file").url },
      ]);
      assert.strictEqual(yield* Ref.get(prepared), 1);
      assert.strictEqual(yield* Ref.get(completing), 1);
      assert.strictEqual((yield* Ref.get(progress)).at(-1), 1);
      assert.strictEqual(yield* Ref.get(store.completed), 1);
    })
  );

  it.effect("sends no description when none was written", () =>
    Effect.gen(function* noDescription() {
      const store = yield* fakes(single);
      const { events } = yield* listening;

      yield* uploadFile(store.api, fileOf(3), { altText: "   ", events }).pipe(
        Effect.provideService(Transfer, store.transfer)
      );

      assert.isNull((yield* Ref.get(store.created))[0]?.altText);
    })
  );

  it.effect("takes a 412 on a new try as the file an earlier try stored", () =>
    Effect.gen(function* storedBefore() {
      const store = yield* fakes(single, {
        [request("file").url]: [null, 412],
      });

      const { events } = yield* listening;

      const fiber = yield* uploadFile(store.api, fileOf(12), {
        altText: "",
        events,
      }).pipe(
        Effect.provideService(Transfer, store.transfer),
        Effect.forkChild
      );

      yield* TestClock.adjust("1 minute");

      assert.deepStrictEqual(yield* Fiber.join(fiber), ready);
      assert.strictEqual((yield* Ref.get(store.tries))[request("file").url], 2);
      assert.deepStrictEqual(yield* Ref.get(store.discarded), []);
    })
  );

  it.effect("sends a large file's parts at once, each with its bytes", () =>
    Effect.gen(function* parts() {
      const size = 5 * 7 + 3;

      const store = yield* fakes(inParts(size), {
        [request("part-3").url]: [503],
      });

      const { events, progress } = yield* listening;

      const fiber = yield* uploadFile(store.api, fileOf(size), {
        altText: "",
        events,
      }).pipe(
        Effect.provideService(Transfer, store.transfer),
        Effect.forkChild
      );

      yield* TestClock.adjust("1 minute");
      yield* Fiber.join(fiber);

      const sent = yield* Ref.get(store.sent);

      assert.deepStrictEqual(
        sent
          .toSorted((left, right) => left.url.localeCompare(right.url))
          .map(({ bytes, url }) => [url, bytes.length]),
        Array.from({ length: 8 }, (_, index) => [
          request(`part-${index + 1}`).url,
          index === 7 ? 3 : 5,
        ])
      );

      const third = sent.find(({ url }) => url === request("part-3").url);

      assert.deepStrictEqual(third?.bytes, indices(10, 15));
      assert.strictEqual(
        (yield* Ref.get(store.tries))[request("part-3").url],
        2
      );
      assert.strictEqual(yield* Ref.get(store.mostInFlight), partConcurrency);
      assert.strictEqual((yield* Ref.get(progress)).at(-1), 1);
      assert.strictEqual(yield* Ref.get(store.completed), 1);
    })
  );

  it.effect("gives up on an expired link, and deletes the media", () =>
    Effect.gen(function* expired() {
      const store = yield* fakes(inParts(12), {
        [request("part-2").url]: [403],
      });

      const { events } = yield* listening;

      const failure = yield* Effect.flip(
        uploadFile(store.api, fileOf(12), { altText: "", events }).pipe(
          Effect.provideService(Transfer, store.transfer)
        )
      );

      assert.deepStrictEqual(
        failure,
        new UploadFailed({ reason: "linkExpired" })
      );
      assert.deepStrictEqual(yield* Ref.get(store.discarded), [mediaId]);
      assert.strictEqual(yield* Ref.get(store.completed), 0);
    })
  );

  it.effect("reports a connection that keeps dropping", () =>
    Effect.gen(function* offline() {
      const store = yield* fakes(single, {
        [request("file").url]: Array.from({ length: 10 }, () => null),
      });

      const { events } = yield* listening;

      const fiber = yield* uploadFile(store.api, fileOf(4), {
        altText: "",
        events,
      }).pipe(
        Effect.provideService(Transfer, store.transfer),
        Effect.forkChild
      );

      yield* TestClock.adjust("5 minutes");

      assert.deepStrictEqual(
        yield* Effect.flip(Fiber.join(fiber)),
        new UploadFailed({ reason: "network" })
      );
      assert.deepStrictEqual(yield* Ref.get(store.discarded), [mediaId]);
    })
  );

  it.effect("cancels: stops sending and deletes the media", () =>
    Effect.gen(function* cancels() {
      const store = yield* fakes(single);
      const { events } = yield* listening;
      const started = yield* Latch.make();

      const stuck = Transfer.of({
        put: () => started.open.pipe(Effect.andThen(Effect.never)),
      });

      const fiber = yield* uploadFile(store.api, fileOf(4), {
        altText: "",
        events,
      }).pipe(Effect.provideService(Transfer, stuck), Effect.forkChild);

      yield* started.await;
      yield* Fiber.interrupt(fiber);

      assert.deepStrictEqual(yield* Ref.get(store.discarded), [mediaId]);
      assert.strictEqual(yield* Ref.get(store.completed), 0);
    })
  );

  it.effect("cancels while the file is checked, and deletes the media", () =>
    Effect.gen(function* cancelsWhileChecked() {
      const store = yield* fakes(single);
      const { completing, events } = yield* listening;
      const checking = yield* Latch.make();

      const api: UploadApi = {
        ...store.api,
        complete: () => checking.open.pipe(Effect.andThen(Effect.never)),
      };

      const fiber = yield* uploadFile(api, fileOf(4), {
        altText: "",
        events,
      }).pipe(
        Effect.provideService(Transfer, store.transfer),
        Effect.forkChild
      );

      yield* checking.await;
      yield* Fiber.interrupt(fiber);

      assert.strictEqual(yield* Ref.get(completing), 1);
      assert.deepStrictEqual(yield* Ref.get(store.discarded), [mediaId]);
    })
  );

  it.effect.each([
    { reason: "incomplete" },
    { reason: "rejectedType" },
    { reason: "storeUnavailable" },
  ] as const)(
    "deletes the media when checking the file fails ($reason), so a new try starts afresh",
    ({ reason }) =>
      Effect.gen(function* checkFails() {
        const store = yield* fakes(single);
        const { events } = yield* listening;

        const api: UploadApi = {
          ...store.api,
          complete: () => Effect.fail(new UploadFailed({ reason })),
        };

        const failure = yield* Effect.flip(
          uploadFile(api, fileOf(4), { altText: "", events }).pipe(
            Effect.provideService(Transfer, store.transfer)
          )
        );

        assert.deepStrictEqual(failure, new UploadFailed({ reason }));
        assert.deepStrictEqual(yield* Ref.get(store.discarded), [mediaId]);
      })
  );

  it.effect("refuses a plan that does not cover the file", () =>
    Effect.gen(function* wrongPlan() {
      const store = yield* fakes(inParts(10));
      const { events } = yield* listening;

      const failure = yield* Effect.flip(
        uploadFile(store.api, fileOf(12), { altText: "", events }).pipe(
          Effect.provideService(Transfer, store.transfer)
        )
      );

      assert.deepStrictEqual(
        failure,
        new UploadFailed({ reason: "unexpected" })
      );
      assert.deepStrictEqual(yield* Ref.get(store.sent), []);
      assert.deepStrictEqual(yield* Ref.get(store.discarded), [mediaId]);
    })
  );
});
