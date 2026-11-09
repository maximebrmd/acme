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
     * tokens rest on the user: granted by them, or their own account. Then
     * records the request under `code`: both happen, or neither.
     */
    readonly erase: (request: {
      readonly app: MetaAppKind;
      readonly code: string;
      readonly now: DateTime.Utc;
      readonly platforms: readonly Platform[];
      readonly userId: string;
    }) => Effect.Effect<DataDeletion, DatabaseError>;
    /** The request recorded under `code`, if any. */
    readonly find: (
      code: string
    ) => Effect.Effect<Option.Option<DataDeletion>, DatabaseError>;
  }
>()("acme-server/channels/application/DataDeletions") {}
