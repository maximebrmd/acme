import { Context, DateTime, Effect, Layer } from "effect";

import type { InboxAccessDenied } from "#notifications/domain/inbox-access-denied.ts";
import type { InboxReader } from "#notifications/domain/inbox-reader.ts";
import type { NoticeId } from "#notifications/domain/notice-id.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { inboxOwner } from "./inbox-owner.ts";
import { NoticeStore } from "./notice-store.ts";
import type { NoticePage, NoticePageRequest } from "./notice-store.ts";
import { ReaderStanding } from "./reader-standing.ts";

type Failure = DatabaseError | InboxAccessDenied;

/**
 * A user's notices, across their workspaces: reading them, and marking them
 * read. Marking answers with how many stay unread.
 */
export class NoticeInbox extends Context.Service<
  NoticeInbox,
  {
    readonly page: (
      reader: InboxReader,
      request: NoticePageRequest
    ) => Effect.Effect<NoticePage, Failure>;
    readonly unread: (reader: InboxReader) => Effect.Effect<number, Failure>;
    readonly markRead: (
      reader: InboxReader,
      noticeIds: readonly NoticeId[]
    ) => Effect.Effect<number, Failure>;
    readonly markAllRead: (
      reader: InboxReader
    ) => Effect.Effect<number, Failure>;
  }
>()("acme-server/notifications/application/NoticeInbox") {
  static readonly layer = Layer.effect(
    NoticeInbox,
    Effect.gen(function* NoticeInboxLive() {
      const store = yield* NoticeStore;
      const owner = inboxOwner(yield* ReaderStanding);

      const page = Effect.fn("NoticeInbox.page")(function* page(
        reader: InboxReader,
        request: NoticePageRequest
      ) {
        const userId = yield* owner(reader, "read");

        return yield* store.page(userId, request);
      });

      const unread = Effect.fn("NoticeInbox.unread")(function* unread(
        reader: InboxReader
      ) {
        const userId = yield* owner(reader, "read");

        return yield* store.unread(userId);
      });

      const markRead = Effect.fn("NoticeInbox.markRead")(function* markRead(
        reader: InboxReader,
        noticeIds: readonly NoticeId[]
      ) {
        const userId = yield* owner(reader, "change");

        yield* store.markRead(userId, noticeIds, yield* DateTime.now);

        return yield* store.unread(userId);
      });

      const markAllRead = Effect.fn("NoticeInbox.markAllRead")(
        function* markAllRead(reader: InboxReader) {
          const userId = yield* owner(reader, "change");

          yield* store.markAllRead(userId, yield* DateTime.now);

          return yield* store.unread(userId);
        }
      );

      return NoticeInbox.of({ markAllRead, markRead, page, unread });
    })
  );
}
