import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { NoticeId } from "#notifications/domain/notice-id.ts";
import type { Notice } from "#notifications/domain/notice.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";

/** A page of a user's notices to read, newest first. */
export interface NoticePageRequest {
  /** The last notice of the page before, if this is not the first. */
  readonly after: Option.Option<NoticeId>;
  readonly limit: number;
}

export interface NoticePage {
  readonly items: readonly Notice[];
  /** Where the next page starts, if there is one. */
  readonly next: Option.Option<NoticeId>;
}

/** A new notice, and whether it goes out by email too. */
export interface NewNotice {
  readonly email: boolean;
  readonly notice: Notice;
}

/** How sending a notice's email ended. */
export type EmailOutcome =
  // The transport took it.
  | "sent"
  // The transport refused it for good, or kept failing.
  | "failed"
  // The reader no longer wants it, or no longer belongs to the workspace,
  // or someone dealt with the event before it went out.
  | "skipped";

/**
 * Every user's notices, and the emails still to send for them. Reads and
 * changes that name a user only see that user's notices, whatever the ids.
 */
export class NoticeStore extends Context.Service<
  NoticeStore,
  {
    /** Saves the notices one event made, under its key. */
    readonly add: (
      key: string,
      notices: readonly NewNotice[]
    ) => Effect.Effect<void, DatabaseError>;
    readonly page: (
      userId: UserId,
      request: NoticePageRequest
    ) => Effect.Effect<NoticePage, DatabaseError>;
    readonly unread: (userId: UserId) => Effect.Effect<number, DatabaseError>;
    /** Marks those of the notices that are the user's and unread. */
    readonly markRead: (
      userId: UserId,
      noticeIds: readonly NoticeId[],
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    readonly markAllRead: (
      userId: UserId,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /** The notices of the event whose email is still to send. */
    readonly pendingEmails: (
      key: string
    ) => Effect.Effect<readonly Notice[], DatabaseError>;
    /**
     * The event was dealt with: its notices still unread are marked read at
     * `at`, and their emails still pending are skipped.
     */
    readonly resolve: (
      key: string,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /** Records how sending a pending email ended. */
    readonly settleEmail: (
      noticeId: NoticeId,
      outcome: EmailOutcome,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/notifications/application/NoticeStore") {}
