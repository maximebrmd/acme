import { eq } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Redacted } from "effect";
import { Mac, SecureRandom } from "effect/crypto";

import { ContractReferences } from "#billing/application/ports/contract-references.ts";
import { referenceFrom } from "#billing/domain/contract-reference.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { authSecretConfig } from "#shared/infrastructure/auth-secret.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { contractReferences } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const encoder = new TextEncoder();

// Apart from anything else the secret keys.
const purpose = "peal-contract-reference-v1:";

/**
 * Contract numbers as the HMAC-SHA256 of the subscription's id, keyed with
 * the server's secret, written by `referenceFrom`: the same for a
 * subscription each time, and nobody's to compute without the secret. Each
 * number issued is kept, so it finds its subscription, and still does once
 * the secret changes.
 */
export const KeyedContractReferencesLive = Layer.effect(
  ContractReferences,
  Effect.gen(function* KeyedContractReferencesLive() {
    const db = yield* Drizzle;
    const secret = yield* authSecretConfig;
    const mac = yield* Mac.Mac;

    const key = yield* Mac.key(
      Mac.hmacSha256,
      encoder.encode(Redacted.value(secret))
    ).pipe(Effect.orDie);

    const issue = Effect.fn("ContractReferences.issue")(function* issue(
      stripeSubscriptionId: string
    ) {
      const [issued] = yield* db
        .select({ reference: contractReferences.reference })
        .from(contractReferences)
        .where(
          eq(contractReferences.stripeSubscriptionId, stripeSubscriptionId)
        )
        .limit(1)
        .pipe(Effect.mapError(failed));

      if (issued !== undefined) {
        return issued.reference;
      }

      const reference = referenceFrom(
        // A tag that cannot be computed is a bug.
        yield* mac
          .sign(key, encoder.encode(`${purpose}${stripeSubscriptionId}`))
          .pipe(Effect.orDie)
      );

      const now = yield* DateTime.now;

      yield* db
        .insert(contractReferences)
        .values({
          issuedAt: DateTime.toDateUtc(now),
          reference,
          stripeSubscriptionId,
        })
        .onConflictDoNothing()
        .pipe(Effect.mapError(failed));

      return reference;
    });

    const find = (reference: string) =>
      db
        .select({ id: contractReferences.stripeSubscriptionId })
        .from(contractReferences)
        .where(eq(contractReferences.reference, reference))
        .limit(1)
        .pipe(
          Effect.mapError(failed),
          Effect.map(([row]) =>
            Option.fromUndefinedOr(row).pipe(Option.map(({ id }) => id))
          ),
          Effect.withSpan("ContractReferences.find")
        );

    return ContractReferences.of({ find, issue });
  })
).pipe(
  Layer.provide(
    Mac.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))
  )
);
