import { Context, Effect, Layer, Ref } from "effect";
import type { DateTime } from "effect";

import { EndpointNotices } from "#webhooks/application/ports/endpoint-notices.ts";
import type { WebhookEndpointId } from "#webhooks/domain/webhook-endpoint-id.ts";

/** An endpoint a use case said was turned off. */
export interface ToldNotice {
  readonly at: DateTime.Utc;
  readonly endpointId: WebhookEndpointId;
  readonly reason: "failing" | "gone";
}

/** An EndpointNotices that records what it is told. */
export class ToldNotices extends Context.Service<
  ToldNotices,
  {
    readonly about: (
      endpointId: WebhookEndpointId
    ) => Effect.Effect<readonly ToldNotice[]>;
    /** When the endpoint's deliveries were told failing for good. */
    readonly failingAbout: (
      endpointId: WebhookEndpointId
    ) => Effect.Effect<readonly DateTime.Utc[]>;
  }
>()("peal-server/test/webhooks/ToldNotices") {
  static readonly layer = Layer.effectContext(
    Effect.gen(function* ToldNoticesLive() {
      const told = yield* Ref.make<readonly ToldNotice[]>([]);

      const failing = yield* Ref.make<
        readonly (readonly [WebhookEndpointId, DateTime.Utc])[]
      >([]);

      return Context.make(
        EndpointNotices,
        EndpointNotices.of({
          failing: (endpoint, at) =>
            Ref.update(failing, (all) => [...all, [endpoint.id, at] as const]),
          turnedOff: (endpoint, reason, at) =>
            Ref.update(told, (all) => [
              ...all,
              { at, endpointId: endpoint.id, reason },
            ]),
        })
      ).pipe(
        Context.add(ToldNotices, {
          about: (endpointId) =>
            Ref.get(told).pipe(
              Effect.map((all) =>
                all.filter((notice) => notice.endpointId === endpointId)
              )
            ),
          failingAbout: (endpointId) =>
            Ref.get(failing).pipe(
              Effect.map((all) =>
                all.flatMap(([id, at]) => (id === endpointId ? [at] : []))
              )
            ),
        })
      );
    })
  );
}
