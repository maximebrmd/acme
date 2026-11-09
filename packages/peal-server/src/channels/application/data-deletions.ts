import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type {
  DataDeletion,
  MetaAppKind,
} from "#channels/domain/data-deletion.ts";
import type { Platform } from "#channels/domain/platform.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Carries out data deletion requests and remembers them for their status
 * page. Which user a request was about is never kept.
 */
export class DataDeletions extends Context.Service<
  DataDeletions,
  {
    /**
     * Deletes, in every workspace, the channels on these platforms whose
     * tokens rest on the user: granted by them, or their own account, and
     * the accounts their sign-in offers a member to choose from, with their
     * tokens. Then records the request under `code`, which counts the
     * channels: all of it happens, or none.
     *
     * A signed request carried out before, sent again as Meta retries it or
     * as anyone who kept it could, deletes nothing: the deletion it was
     * comes back, with its code. Otherwise a request replayed after the
     * user connected accounts again would delete them.
     */
    readonly erase: (request: {
      readonly app: MetaAppKind;
      readonly code: string;
      readonly now: DateTime.Utc;
      readonly platforms: readonly Platform[];
      /** The request as Meta sent it, whose signature checked out. */
      readonly signedRequest: string;
      readonly userId: string;
    }) => Effect.Effect<DataDeletion, DatabaseError>;
    /** The request recorded under `code`, if any. */
    readonly find: (
      code: string
    ) => Effect.Effect<Option.Option<DataDeletion>, DatabaseError>;
  }
>()("acme-server/channels/application/DataDeletions") {}
