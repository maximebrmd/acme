import { Schema } from "effect";

/**
 * What an endpoint can ask to hear about. Public contract, which receivers
 * route on: add a type, never rename or remove one.
 */
export const SubscribableEventTypeSchema = Schema.Literals([
  "post.scheduled",
  "post.unscheduled",
  "post.published",
  "post.failed",
  "post.unconfirmed",
  "post.cancelled",
  "post.approval_requested",
  "post.approved",
  "post.changes_requested",
  "channel.connected",
  "channel.disconnected",
  "channel.reconnect_needed",
  "media.ready",
  "media.failed",
  "boost.started",
  "boost.paused",
  "boost.resumed",
  "boost.stopped",
  "boost.ended",
  "boost.failed",
  "boost.unconfirmed",
  "boost.budget_reached",
]);

export type SubscribableEventType = typeof SubscribableEventTypeSchema.Type;

/**
 * Every type of event Peal sends: those endpoints subscribe to, and
 * `webhook.test`, which a member sends to one endpoint to try it, whatever
 * it subscribes to.
 */
export const WebhookEventTypeSchema = Schema.Literals([
  ...SubscribableEventTypeSchema.literals,
  "webhook.test",
]);

export type WebhookEventType = typeof WebhookEventTypeSchema.Type;
