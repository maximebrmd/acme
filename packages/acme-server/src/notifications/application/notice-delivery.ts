import { Context } from "effect";
import type { Effect } from "effect";

/**
 * Sends the emails an event's notices wait for, after the transaction that
 * saved them commits, and keeps trying for a while when the transport is
 * down. Starting it twice for one key sends them once.
 */
export class NoticeDelivery extends Context.Service<
  NoticeDelivery,
  { readonly start: (key: string) => Effect.Effect<void> }
>()("acme-server/notifications/application/NoticeDelivery") {}
