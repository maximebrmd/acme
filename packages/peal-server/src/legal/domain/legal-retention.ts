import { DateTime } from "effect";

/**
 * How long Peal keeps what the law obliges a hosting provider to keep so
 * that whoever contributed content can be identified (loi n° 2004-575,
 * art. 6, V, A; décret n° 2021-1362):
 *
 * - `identity`: the name and email addresses of a closed account, 5 years
 *   after the contract ends, which closing the account does (art. 2);
 * - `account`: how it signed in (its identifiers; never a password or what
 *   checks one, which art. 3, 3° does not cover: CE, 30 June 2023,
 *   n° 459724) and the references of its payments, 1 year after it closes
 *   (art. 3 and 4);
 * - `connections`: the address and protocols of each connection that
 *   created, changed or deleted content, 1 year after each (art. 5).
 *
 * `disclosures`, the record of each answer to a legal request, stay as
 * long as the longest of them, so Peal can show what it handed over, to
 * whom and on what grounds.
 */
export const legalRetention = {
  account: { years: 1 },
  connections: { years: 1 },
  disclosures: { years: 5 },
  identity: { years: 5 },
} as const;

/** When what an account closed at `closedAt` left stops being kept. */
export interface HeldUntil {
  /** Its sign-in identifiers and payment references. */
  readonly account: DateTime.Utc;
  /** Its name and email addresses: the whole record. */
  readonly identity: DateTime.Utc;
}

/** The ends of what an account closed at `closedAt` left. */
export const heldUntil = (closedAt: DateTime.Utc): HeldUntil => ({
  account: DateTime.add(closedAt, legalRetention.account),
  identity: DateTime.add(closedAt, legalRetention.identity),
});

/**
 * The instants the daily purge compares with at `now`: a closed account's
 * record goes once it closed before `identity`, and keeps only its name and
 * addresses once it closed before `account`; a connection goes once made
 * before `connections`, an answer to a legal request once made before
 * `disclosures`.
 */
export interface LegalCutoffs {
  readonly account: DateTime.Utc;
  readonly connections: DateTime.Utc;
  readonly disclosures: DateTime.Utc;
  readonly identity: DateTime.Utc;
}

/** The cutoffs at `now`. */
export const legalCutoffs = (now: DateTime.Utc): LegalCutoffs => ({
  account: DateTime.subtract(now, legalRetention.account),
  connections: DateTime.subtract(now, legalRetention.connections),
  disclosures: DateTime.subtract(now, legalRetention.disclosures),
  identity: DateTime.subtract(now, legalRetention.identity),
});
