import { Effect } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/http";

import { UnsubscribeWeeklyDigest } from "#notifications/application/unsubscribe-weekly-digest.ts";
import { publicUrlConfig } from "#shared/infrastructure/environment.ts";

/**
 * Where the weekly digest's `List-Unsubscribe` header points, its token
 * after: outside the contract, without credentials, as a mail client
 * calls it.
 */
export const digestUnsubscribePath =
  "/api/notifications/weekly-digest/unsubscribe/:token";

// Never cached, never indexed: the address is a capability.
const kept = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
};

/**
 * One-click unsubscribe (RFC 8058): a POST, which mail clients send with
 * `List-Unsubscribe=One-Click`, turns the token holder's weekly digest off
 * (200), or answers 404 to a token that is not, or no longer, good. A GET,
 * as a link opened in a browser or fetched ahead by a mail scanner, changes
 * nothing and sends the reader to the notification preferences, where they
 * turn it off themselves.
 */
export const DigestUnsubscribeLive = HttpRouter.use(
  Effect.fn(function* digestUnsubscribe(router) {
    const digest = yield* UnsubscribeWeeklyDigest;
    const publicUrl = yield* publicUrlConfig;
    const preferences = new URL("/app/notices/preferences", publicUrl).href;

    yield* router.add(
      "POST",
      digestUnsubscribePath,
      Effect.gen(function* unsubscribe() {
        const { token } = yield* HttpRouter.params;
        const done = yield* digest.unsubscribe(token ?? "").pipe(Effect.orDie);

        return HttpServerResponse.empty({
          headers: kept,
          status: done ? 200 : 404,
        });
      })
    );

    yield* router.add(
      "GET",
      digestUnsubscribePath,
      Effect.succeed(
        HttpServerResponse.empty({
          headers: { ...kept, location: preferences },
          status: 302,
        })
      )
    );
  })
);
