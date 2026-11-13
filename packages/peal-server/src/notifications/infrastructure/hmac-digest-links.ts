import { Effect, Layer, Option, Redacted, Result, Schema } from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { Base64Url } from "effect/encoding";

import { DigestLinks } from "#notifications/application/digest-links.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { authSecretConfig } from "#shared/infrastructure/auth-secret.ts";

const encoder = new TextEncoder();

// Apart from anything else the secret keys.
const purpose = "peal-weekly-digest-unsubscribe-v1:";

const decodeUserId = Schema.decodeUnknownOption(UserIdSchema);

const decodeLinks = Schema.decodeUnknownOption(
  Schema.NumberFromString.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(0)
  )
);

const signed = (userId: UserId, links: number) =>
  encoder.encode(`${purpose}${userId}:${String(links)}`);

/**
 * Tokens written `<user>.<generation>.<tag>`, the tag the HMAC-SHA256 of
 * both with the server's secret (BETTER_AUTH_SECRET), in base64url: safe in
 * a path segment. Changing the secret revokes every token.
 */
export const HmacDigestLinks = Layer.effect(
  DigestLinks,
  Effect.gen(function* HmacDigestLinks() {
    const secret = yield* authSecretConfig;
    const mac = yield* Mac.Mac;

    const key = yield* Mac.key(
      Mac.hmacSha256,
      encoder.encode(Redacted.value(secret))
    ).pipe(Effect.orDie);

    const tokenOf = (userId: UserId, links: number) =>
      mac.sign(key, signed(userId, links)).pipe(
        Effect.map(
          (tag) => `${userId}.${String(links)}.${Base64Url.encode(tag)}`
        ),
        // A tag that cannot be computed is a bug.
        Effect.orDie,
        Effect.withSpan("DigestLinks.tokenOf")
      );

    const read = (token: string) => {
      const parts = token.split(".");
      const [user, generation, written] = parts;

      const holder = Option.all({
        links: decodeLinks(generation),
        tag: Option.fromUndefinedOr(written).pipe(
          Option.filter((tag) => tag !== ""),
          Option.flatMap((tag) => Result.getSuccess(Base64Url.decode(tag)))
        ),
        userId: decodeUserId(user),
      }).pipe(Option.filter(() => parts.length === 3));

      return Option.match(holder, {
        onNone: () => Effect.succeedNone,
        onSome: ({ links, tag, userId }) =>
          mac.verify(key, tag, signed(userId, links)).pipe(
            Effect.map((valid) =>
              valid ? Option.some({ links, userId }) : Option.none()
            ),
            Effect.orElseSucceed(() => Option.none())
          ),
      }).pipe(Effect.withSpan("DigestLinks.read"));
    };

    return DigestLinks.of({ read, tokenOf });
  })
).pipe(
  Layer.provide(
    Mac.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))
  )
);
