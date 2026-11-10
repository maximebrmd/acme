import { Effect, Layer, Metric, Option, Redacted, Schema } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";
import { RateLimiter } from "effect/persistence";

import { VisitorGuard } from "#review/application/ports/visitor-guard.ts";
import type { VisitorRefusal } from "#review/application/ports/visitor-guard.ts";
import { captchaConfig } from "#shared/infrastructure/captcha-settings.ts";
import type { CaptchaSettings } from "#shared/infrastructure/captcha-settings.ts";

/** How many writes one address may send through review links in a while. */
export const writesPerAddress = { limit: 20, window: "10 minutes" } as const;

/** How many writes one link takes in a while, whoever sends them. */
export const writesPerLink = { limit: 60, window: "1 hour" } as const;

/** Visitors' writes the guard refused, by reason. */
export const refusedVisitorWrites = Metric.counter(
  "peal.review.visitor_writes_refused",
  {
    description: "Writes through review links that the server refused",
    incremental: true,
  }
);

const refuse = (reason: VisitorRefusal) =>
  Metric.update(
    Metric.withAttributes(refusedVisitorWrites, { reason }),
    1
  ).pipe(Effect.as(Option.some(reason)));

// Cloudflare's endpoint, unless the settings name another (a fake in tests).
const siteverify = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const VerificationSchema = Schema.Struct({ success: Schema.Boolean });

// Whether Turnstile takes the token. Anything else than its yes is a no:
// a visitor is asked again rather than let through unchecked.
const verified = (
  client: HttpClient.HttpClient,
  settings: CaptchaSettings,
  token: string
) =>
  HttpClientRequest.post(
    Option.getOrElse(settings.verifyUrl, () => siteverify)
  ).pipe(
    HttpClientRequest.bodyJsonUnsafe({
      response: token,
      secret: Redacted.value(settings.secretKey),
    }),
    client.execute,
    Effect.flatMap(HttpClientResponse.schemaBodyJson(VerificationSchema)),
    Effect.map(({ success }) => success),
    Effect.timeout("10 seconds"),
    Effect.catch(() =>
      Effect.logWarning("Turnstile could not check a reviewer's token").pipe(
        Effect.as(false)
      )
    )
  );

/**
 * VisitorGuard: `writesPerAddress` and `writesPerLink`, counted in this
 * process, then Turnstile where the server has its keys
 * (`TURNSTILE_SECRET_KEY` and `TURNSTILE_SITE_KEY`), each token checked
 * once with Cloudflare. Addresses are counted, never stored or logged.
 */
export const LimitedVisitorGuard = Layer.effect(
  VisitorGuard,
  Effect.gen(function* LimitedVisitorGuard() {
    const limiter = yield* RateLimiter.make;
    const client = yield* HttpClient.HttpClient;
    const captcha = yield* captchaConfig;

    const within = (
      key: string,
      { limit, window }: typeof writesPerAddress | typeof writesPerLink
    ) =>
      limiter
        .consume({
          algorithm: "fixed-window",
          key,
          limit,
          onExceeded: "fail",
          window,
        })
        .pipe(
          Effect.as(true),
          Effect.catchTag("RateLimiterError", (failure) =>
            failure.reason._tag === "RateLimitExceeded"
              ? Effect.succeed(false)
              : Effect.die(failure)
          )
        );

    return VisitorGuard.of({
      admit: Effect.fn("VisitorGuard.admit")(function* admit({
        address,
        captchaToken,
        linkId,
      }) {
        const room =
          (yield* within(`review-address:${address}`, writesPerAddress)) &&
          (yield* within(`review-link:${linkId}`, writesPerLink));

        if (!room) {
          return yield* refuse("tooManyRequests");
        }

        if (Option.isNone(captcha)) {
          return Option.none();
        }

        const passed =
          Option.isSome(captchaToken) &&
          (yield* verified(client, captcha.value, captchaToken.value));

        return passed ? Option.none() : yield* refuse("captchaRequired");
      }),
    });
  })
).pipe(
  Layer.provide(
    Layer.mergeAll(RateLimiter.layerStoreMemory, FetchHttpClient.layer)
  )
);
