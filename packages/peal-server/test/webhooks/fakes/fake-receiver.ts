import { Effect } from "effect";

import {
  empty,
  platformServer,
  scripted,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  PlatformAnswer,
  PlatformRequest,
} from "#test/publishing/fakes/platform-server.ts";
import { WebhookUrlSchema } from "#webhooks/domain/webhook-url.ts";

/**
 * What the receiver does with the next delivery instead of taking it: an
 * answer, or `stall`, which keeps the connection open without answering.
 */
export type ReceiverScript = PlatformAnswer | { readonly _tag: "stall" };

const route = "POST /hooks";

/**
 * A webhook receiver on loopback: it takes every delivery with 204 unless
 * a test scripted another answer, and keeps what it received.
 */
export const fakeReceiver = Effect.fnUntraced(function* fakeReceiver() {
  const scripts = scripted<ReceiverScript>();
  const stalled: (() => void)[] = [];

  const server = yield* platformServer(async (request: PlatformRequest) => {
    const script = scripts.next(`${request.method} ${request.path}`);

    if (script === undefined) {
      return empty(204);
    }

    if (script._tag === "stall") {
      // Until the test ends, when the server closes its connections.
      const { promise, resolve } = Promise.withResolvers<null>();

      stalled.push(() => {
        resolve(null);
      });
      await promise;

      return empty(204);
    }

    return script;
  });

  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      for (const release of stalled) {
        release();
      }
    })
  );

  return {
    /** The deliveries received so far, in order. */
    deliveries: () => server.requests().filter(({ path }) => path === "/hooks"),
    /** Queues answers for the next deliveries, each used once. */
    next: (...answers: readonly ReceiverScript[]) => {
      scripts.push(route, answers);
    },
    /** Where deliveries go. Loopback: reached only through an open guard. */
    url: WebhookUrlSchema.make(`${server.url}/hooks`),
  };
});
