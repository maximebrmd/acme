import { Schema } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

import { NoticeEventSchema } from "./notice-event.ts";
import { NoticeIdSchema } from "./notice-id.ts";

/**
 * What one member hears about one event in one of their workspaces: kept as
 * the event's data, read or not. Every member the event concerns gets their
 * own, so each reads theirs in their own time.
 */
export class Notice extends Schema.Class<Notice>(
  "acme-server/notifications/domain/Notice"
)({
  createdAt: Schema.DateTimeUtc,
  event: NoticeEventSchema,
  id: NoticeIdSchema,
  // When the member marked it read; none while it is unread.
  readAt: Schema.Option(Schema.DateTimeUtc),
  userId: UserIdSchema,
  workspaceId: WorkspaceIdSchema,
}) {}
