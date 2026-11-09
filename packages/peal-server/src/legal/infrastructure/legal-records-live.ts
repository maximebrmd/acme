import { Config, Effect, Layer } from "effect";

import { LegalRecords } from "#legal/application/legal-records.ts";

/**
 * Whether the server keeps what French law has a host keep
 * (`PEAL_LEGAL_RETENTION`, off unless `true`). The obligation falls on
 * some operators only (a host established in France, or offering its
 * service there), and data minimisation (GDPR, art. 5(1)(c)) forbids the
 * others to keep it: so a server keeps nothing until its operator says the
 * law has them do so. Peal's own servers turn it on.
 */
const legalRetentionConfig = Config.Boolean("PEAL_LEGAL_RETENTION").pipe(
  Config.withDefault(false)
);

/** LegalRecords, kept or not as `PEAL_LEGAL_RETENTION` says. Needs LegalStore and Ids. */
export const LegalRecordsLive = Layer.unwrap(
  Effect.gen(function* LegalRecordsLive() {
    const kept = yield* legalRetentionConfig;

    return kept ? LegalRecords.layer : LegalRecords.layerOff;
  })
);
