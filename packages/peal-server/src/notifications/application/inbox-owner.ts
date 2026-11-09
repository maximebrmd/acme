import { Effect } from "effect";

import { InboxAccessDenied } from "#notifications/domain/inbox-access-denied.ts";
import { authorizeInbox } from "#notifications/domain/inbox-reader.ts";
import type {
  InboxAction,
  InboxReader,
} from "#notifications/domain/inbox-reader.ts";

import type { ReaderStanding } from "./reader-standing.ts";

/**
 * Finds the user whose notices and preferences a reader acts on: if the
 * reader may, and the user may still use Acme.
 */
export const inboxOwner = (standing: ReaderStanding["Service"]) =>
  Effect.fn("Notifications.inboxOwner")(function* findOwner(
    reader: InboxReader,
    action: InboxAction
  ) {
    const userId = yield* Effect.fromResult(authorizeInbox(reader, action));

    if (!(yield* standing.isActive(userId))) {
      return yield* new InboxAccessDenied({ action });
    }

    return userId;
  });
