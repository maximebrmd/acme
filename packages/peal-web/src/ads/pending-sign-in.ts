import { Option, Schema } from "effect";
import { AdNetworkSchema } from "peal-contract";
import type { AdNetwork } from "peal-contract";

// The ad network sends the browser back to one callback page for every
// workspace, so the tab remembers, between leaving for the network and
// coming back, which workspace the sign-in is for. The server checks that
// the sign-in is this member's in this workspace either way.
const storageKey = "peal.ads.pending-sign-in";

const PendingSchema = Schema.Struct({
  network: AdNetworkSchema,
  workspaceId: Schema.String,
});

export type PendingAdSignIn = typeof PendingSchema.Type;

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

/** Remembers the sign-in about to leave for the ad network. */
export const rememberAdSignIn = (pending: PendingAdSignIn): void => {
  for (const tab of Option.toArray(storage())) {
    tab.setItem(storageKey, JSON.stringify(pending));
  }
};

/**
 * The workspace of the sign-in this tab started at the network, or null
 * when the tab started none.
 */
export const pendingAdWorkspace = (network: AdNetwork): string | null =>
  storage().pipe(
    Option.flatMap((tab) => Option.fromNullOr(tab.getItem(storageKey))),
    Option.flatMap(decodePending),
    Option.filter((pending) => pending.network === network),
    Option.map(({ workspaceId }) => workspaceId),
    Option.getOrNull
  );

/** Forgets the sign-in once the network sent the member back. */
export const forgetAdSignIn = (): void => {
  for (const tab of Option.toArray(storage())) {
    tab.removeItem(storageKey);
  }
};
