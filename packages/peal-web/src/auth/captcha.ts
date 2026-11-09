import { Effect, Option } from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Api } from "peal-contract";

import { serverUrl } from "#api/server-url.ts";

const readSiteKey = Effect.fn("captchaSiteKey")(function* readSiteKey() {
  const client = yield* HttpApiClient.make(Api, { baseUrl: yield* serverUrl });
  const { turnstileSiteKey } = yield* client.captcha.get();

  return Option.fromNullOr(turnstileSiteKey);
}, Effect.provide(FetchHttpClient.layer));

/**
 * For Server Components: the Turnstile site key the sign-up and password
 * reset forms show the widget with, or none when the server asks for no
 * captcha. When the server cannot tell, the form shows no widget, and the
 * server refuses it if it wanted one.
 */
export const captchaSiteKey = async (): Promise<Option.Option<string>> =>
  await Effect.runPromise(
    readSiteKey().pipe(
      Effect.timeout("5 seconds"),
      Effect.catchCause((cause) =>
        Effect.logWarning("The captcha settings could not be read", cause).pipe(
          Effect.as(Option.none<string>())
        )
      )
    )
  );
