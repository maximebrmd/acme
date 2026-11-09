import { Effect, Layer, Option, Redacted, Result, Schema } from "effect";
import { Mac } from "effect/crypto";
import { Base64Url } from "effect/encoding";

import { InvalidSignedRequest } from "#channels/application/invalid-signed-request.ts";
import { MetaAppNotConfigured } from "#channels/application/meta-app-not-configured.ts";
import { SignedRequests } from "#channels/application/signed-requests.ts";
import type { MetaAppKind } from "#channels/domain/data-deletion.ts";
import { ChannelPlatforms } from "#channels/infrastructure/platforms/channel-platform-settings.ts";
import type { MetaApp } from "#shared/infrastructure/platforms/meta-apps.ts";

// A signed request is `<signature>.<payload>`, both base64url: the
// signature is the HMAC-SHA256 of the payload as sent, keyed with the app
// secret, and the payload a JSON object (Meta's "Data Deletion Request
// Callback" and "Parsing the Signed Request" pages).
const PayloadSchema = Schema.Struct({
  algorithm: Schema.String,
  user_id: Schema.Union([Schema.NonEmptyString, Schema.Int]),
});

const decodePayload = Schema.decodeUnknownOption(
  Schema.fromJsonString(PayloadSchema)
);

const encoder = new TextEncoder();

const refused = (reason: string) => new InvalidSignedRequest({ reason });

// A request no longer than Meta's: a few hundred bytes.
const maxLength = 8192;

/** Signed requests checked against the secrets of the apps configured. */
export const MetaSignedRequestsLive = Layer.effect(
  SignedRequests,
  Effect.gen(function* MetaSignedRequestsLive() {
    const settings = yield* ChannelPlatforms;
    const mac = yield* Mac.Mac;

    const appOf = (app: MetaAppKind): Option.Option<MetaApp> =>
      app === "facebook" ? settings.meta : settings.threads;

    const verify = Effect.fn("SignedRequests.verify")(function* verify(
      app: MetaAppKind,
      signedRequest: string
    ) {
      const configured = appOf(app);

      if (Option.isNone(configured)) {
        return yield* new MetaAppNotConfigured({ app });
      }

      const separator = signedRequest.indexOf(".");

      if (
        signedRequest.length > maxLength ||
        separator <= 0 ||
        separator === signedRequest.length - 1
      ) {
        return yield* refused("not a signed request");
      }

      const encodedPayload = signedRequest.slice(separator + 1);
      const signature = Base64Url.decode(signedRequest.slice(0, separator));

      if (Result.isFailure(signature)) {
        return yield* refused("the signature is not base64url");
      }

      const key = yield* Mac.key(
        Mac.hmacSha256,
        encoder.encode(Redacted.value(configured.value.appSecret))
      ).pipe(Effect.orDie);

      const valid = yield* mac
        .verify(key, signature.success, encoder.encode(encodedPayload))
        .pipe(Effect.orDie);

      if (!valid) {
        return yield* refused("the signature does not match");
      }

      const payload = Result.getSuccess(
        Base64Url.decodeString(encodedPayload)
      ).pipe(Option.flatMap(decodePayload));

      if (Option.isNone(payload)) {
        return yield* refused("the payload is not readable");
      }

      if (payload.value.algorithm.toUpperCase() !== "HMAC-SHA256") {
        return yield* refused("the algorithm is not HMAC-SHA256");
      }

      return { userId: String(payload.value.user_id) };
    });

    return SignedRequests.of({ verify });
  })
);
