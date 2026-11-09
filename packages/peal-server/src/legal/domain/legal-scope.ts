import { Schema } from "effect";
import type { DateTime } from "effect";

/**
 * What a legal request may ask for, by the décret's categories (décret
 * n° 2021-1362): `identity`, who held a closed account (art. 2); `signIn`,
 * the identifiers it signed in with (art. 3); `payments`, the references
 * of its payments (art. 4); `connections`, the address and protocol of
 * each connection that created, changed or deleted content (art. 5).
 */
export const LegalCoverSchema = Schema.Literals([
  "identity",
  "signIn",
  "payments",
  "connections",
]);

export type LegalCover = typeof LegalCoverSchema.Type;

/** What a request covers, each category once. */
export const covering = (
  covers: readonly LegalCover[]
): ReadonlySet<LegalCover> => new Set(covers);

/** A closed account's record, as the law has it kept. */
interface Held {
  readonly accountCreatedAt: DateTime.Utc;
  readonly closedAt: DateTime.Utc;
  readonly email: string;
  readonly name: string;
  readonly signInMethods: readonly {
    readonly accountId: string;
    readonly provider: string;
  }[];
  readonly stripeCustomerIds: readonly string[];
  readonly userId: string;
}

/**
 * What a legal request gets of a closed account: its id and when it
 * closed, which tell which record answered, and each category the request
 * covers; null for one it does not.
 */
export interface DisclosedAccount {
  readonly closedAt: DateTime.Utc;
  readonly identity: {
    readonly accountCreatedAt: DateTime.Utc;
    readonly email: string;
    readonly name: string;
  } | null;
  readonly signInMethods: Held["signInMethods"] | null;
  readonly stripeCustomerIds: readonly string[] | null;
  readonly userId: string;
}

/**
 * A closed account's record cut to what the request covers: an authority
 * gets what it asked for and has the power to obtain, nothing more.
 */
export const disclosedOf = (
  held: Held,
  covers: ReadonlySet<LegalCover>
): DisclosedAccount => ({
  closedAt: held.closedAt,
  identity: covers.has("identity")
    ? {
        accountCreatedAt: held.accountCreatedAt,
        email: held.email,
        name: held.name,
      }
    : null,
  signInMethods: covers.has("signIn") ? held.signInMethods : null,
  stripeCustomerIds: covers.has("payments") ? held.stripeCustomerIds : null,
  userId: held.userId,
});
