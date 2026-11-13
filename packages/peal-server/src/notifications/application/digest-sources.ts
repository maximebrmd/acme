import { Context } from "effect";
import type { Effect, Option } from "effect";

import type {
  DigestWeek,
  DigestWorkspace,
} from "#notifications/domain/weekly-digest.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

import type { RecipientsUnavailable } from "./recipients-unavailable.ts";

/** Someone a digest is for, and what it tells them. */
export interface DigestReader {
  readonly email: string;
  readonly locale: Locale;
  /**
   * The workspaces whose posts they may read, as every request decides it
   * (a ban, two-step verification required), each with its week.
   */
  readonly workspaces: readonly DigestWorkspace[];
}

/** What a person's weekly digest is written from. */
export class DigestSources extends Context.Service<
  DigestSources,
  {
    /**
     * The reader and their workspaces' week; none for an account that no
     * longer exists or is banned.
     */
    readonly readerOf: (
      userId: UserId,
      week: DigestWeek
    ) => Effect.Effect<
      Option.Option<DigestReader>,
      DatabaseError | RecipientsUnavailable
    >;
  }
>()("peal-server/notifications/application/DigestSources") {}
