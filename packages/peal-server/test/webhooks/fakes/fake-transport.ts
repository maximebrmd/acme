import { Context, Effect, Layer, Option, Ref } from "effect";

import { WebhookTransport } from "#webhooks/application/ports/webhook-transport.ts";
import type {
  WebhookRequest,
  WebhookResponse,
} from "#webhooks/application/ports/webhook-transport.ts";
import { UrlNotDeliverable } from "#webhooks/application/url-not-deliverable.ts";
import type { AttemptOutcome } from "#webhooks/domain/delivery-attempt.ts";
import { hostOf } from "#webhooks/domain/webhook-url.ts";

/** A receiver's answer with a status, and nothing kept of its body. */
export const answered = (status: number, excerpt?: string): AttemptOutcome => ({
  _tag: "answered",
  excerpt: Option.fromUndefinedOr(excerpt),
  status,
});

const durationMs = 42;

/**
 * A WebhookTransport that sends nothing: it takes every request with 204
 * unless a test queued other outcomes for its host, keeps what it was
 * asked to send, and refuses the hosts ending in `.internal.example` as
 * not public and `.invalid` as unknown.
 */
export class FakeTransport extends Context.Service<
  FakeTransport,
  {
    /** Queues outcomes for the next requests to the host, each used once. */
    readonly next: (
      host: string,
      ...outcomes: readonly AttemptOutcome[]
    ) => Effect.Effect<void>;
    /** The requests sent to the host so far, in order. */
    readonly sentTo: (host: string) => Effect.Effect<readonly WebhookRequest[]>;
  }
>()("peal-server/test/webhooks/FakeTransport") {
  static readonly layer = Layer.effectContext(
    Effect.gen(function* FakeTransportLive() {
      const sent = yield* Ref.make<readonly WebhookRequest[]>([]);

      const queued = yield* Ref.make<
        ReadonlyMap<string, readonly AttemptOutcome[]>
      >(new Map());

      const take = (host: string) =>
        Ref.modify(queued, (all) => {
          const [first, ...rest] = all.get(host) ?? [];

          return [
            first ?? answered(204),
            new Map([...all, [host, rest]]),
          ] as const;
        });

      const transport = WebhookTransport.of({
        check: (url) => {
          const host = hostOf(url);

          if (host.endsWith(".internal.example")) {
            return Effect.fail(new UrlNotDeliverable({ reason: "notPublic" }));
          }

          return host.endsWith(".invalid")
            ? Effect.fail(new UrlNotDeliverable({ reason: "unknownHost" }))
            : Effect.void;
        },
        send: (request) =>
          Ref.update(sent, (all) => [...all, request]).pipe(
            Effect.andThen(take(hostOf(request.url))),
            Effect.map((outcome): WebhookResponse => ({ durationMs, outcome }))
          ),
      });

      return Context.make(WebhookTransport, transport).pipe(
        Context.add(FakeTransport, {
          next: (host, ...outcomes) =>
            Ref.update(
              queued,
              (all) =>
                new Map([
                  ...all,
                  [host, [...(all.get(host) ?? []), ...outcomes]],
                ])
            ),
          sentTo: (host) =>
            Ref.get(sent).pipe(
              Effect.map((all) =>
                all.filter((request) => hostOf(request.url) === host)
              )
            ),
        })
      );
    })
  );
}
