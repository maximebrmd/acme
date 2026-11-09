import { Config, Effect, Layer } from "effect";

import { LegalRecords } from "#legal/application/legal-records.ts";

/**
 * Whether the server keeps what French law has a host keep
 * (`PEAL_LEGAL_RETENTION`, on unless `false`): Peal Cloud must, as a host
 * established in France. An operator under no such obligation, outside
 * France, turns it off, and closing an account then leaves nothing.
 */
const legalRetentionConfig = Config.Boolean("PEAL_LEGAL_RETENTION").pipe(
  Config.withDefault(true)
);

/** LegalRecords, kept or not as `PEAL_LEGAL_RETENTION` says. Needs LegalStore and Ids. */
export const LegalRecordsLive = Layer.unwrap(
  Effect.gen(function* LegalRecordsLive() {
    const kept = yield* legalRetentionConfig;

    return kept ? LegalRecords.layer : LegalRecords.layerOff;
  })
);
