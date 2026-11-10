import { Option, Schema } from "effect";
import { PlatformSchema } from "peal-contract";
import type { Platform } from "peal-contract";

// The platform sends the browser back to one callback page, the same for
// members connecting in the app and for people who came through a connect
// link. The tab remembers, between leaving for the platform and coming
// back, the link it started from, so the callback page completes that
// link's sign-in. It is no secret, and proves nothing: the server completes
// a link's sign-in for the browser that holds its cookie alone.
const storageKey = "peal.connect-link.pending";

const PendingSchema = Schema.Struct({
  platform: PlatformSchema,
  token: Schema.String,
});

export type PendingLink = typeof PendingSchema.Type;

const decodePending = Schema.decodeUnknownOption(
  Schema.fromJsonString(PendingSchema)
);

const storage = (): Option.Option<Storage> => {
  try {
    return Option.some(globalThis.sessionStorage);
  } catch {
    // Storage the browser refuses (some private modes) remembers nothing.
    return Option.none();
  }
};

/** Remembers the link whose sign-in is about to leave for the platform. */
export const rememberLink = (pending: PendingLink): void => {
  for (const tab of Option.toArray(storage())) {
    tab.setItem(storageKey, JSON.stringify(pending));
  }
};

/**
 * The token of the link this tab started a sign-in from for the platform,
 * or null when the tab started none.
 */
export const pendingLink = (platform: Platform): string | null =>
  storage().pipe(
    Option.flatMap((tab) => Option.fromNullOr(tab.getItem(storageKey))),
    Option.flatMap(decodePending),
    Option.filter((pending) => pending.platform === platform),
    Option.map(({ token }) => token),
    Option.getOrNull
  );

/** Forgets the link once its sign-in ended, or another connection starts. */
export const forgetLink = (): void => {
  for (const tab of Option.toArray(storage())) {
    tab.removeItem(storageKey);
  }
};
