import { PlatformSchema } from "peal-contract";
import type { Platform } from "peal-contract";
import { Option, Schema } from "effect";

// The platform sends the browser back to one callback page for every
// workspace, so the tab remembers, between leaving for the platform and
// coming back, which workspace the connection is for. The server checks
// that the connection is this member's in this workspace either way.
const storageKey = "peal.channels.pending-connection";

const PendingSchema = Schema.Struct({
  platform: PlatformSchema,
  workspaceId: Schema.String,
});

export type PendingConnection = typeof PendingSchema.Type;

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

/** Remembers the connection about to leave for the platform. */
export const rememberConnection = (pending: PendingConnection): void => {
  for (const tab of Option.toArray(storage())) {
    tab.setItem(storageKey, JSON.stringify(pending));
  }
};

/**
 * The workspace of the connection this tab started for the platform, as a
 * string, or null when the tab started none.
 */
export const pendingWorkspace = (platform: Platform): string | null =>
  storage().pipe(
    Option.flatMap((tab) => Option.fromNullOr(tab.getItem(storageKey))),
    Option.flatMap(decodePending),
    Option.filter((pending) => pending.platform === platform),
    Option.map(({ workspaceId }) => workspaceId),
    Option.getOrNull
  );

/** Forgets the connection once the platform sent the member back. */
export const forgetConnection = (): void => {
  for (const tab of Option.toArray(storage())) {
    tab.removeItem(storageKey);
  }
};
