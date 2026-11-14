import { describe, expect, it } from "@effect/vitest";
import { Duration } from "effect";
import {
  idempotencyKeyLifetimeHours,
  InboxMessageAbilitiesSchema,
  inboxMessagePlatforms,
  inboxMessageRetentionDays,
  InboxOutgoingMessageReasonSchema,
  InboxOutgoingMessageStatusSchema,
  maxInboxMessageLength,
  InboxAbilitySchema,
  InboxAbilityStandingSchema,
  InboxCollectionEndSchema,
  InboxCommentStateSchema,
  InboxModerationActionSchema,
  inboxPlatforms,
  InboxReplyReasonSchema,
  InboxReplyStatusSchema,
  inboxRetentionDays,
  inboxWindowDays,
  maxInboxPageSize,
  maxInboxReplyLength,
} from "peal-contract";

import { maxThreadsPerPage } from "#engagement/application/engagement-inbox.ts";
import { defaultWindow } from "#engagement/domain/collection-schedule.ts";
import { CommentStateSchema } from "#engagement/domain/comment.ts";
import { conversationsKeptFor } from "#engagement/domain/conversation.ts";
import {
  AbilityStandingSchema,
  engagedPlatforms,
  EngagementAbilitySchema,
} from "#engagement/domain/engagement-abilities.ts";
import { keptAfterCollection } from "#engagement/domain/engagement-retention.ts";
import { MessageAbilitySchema } from "#engagement/domain/message-abilities.ts";
import { maxOutgoingMessageLength } from "#engagement/domain/message-text.ts";
import { ModerationActionSchema } from "#engagement/domain/moderation.ts";
import {
  MessageFailureSchema,
  messageKeyLifetime,
  OutgoingMessageStatusSchema,
} from "#engagement/domain/outgoing-message.ts";
import { maxReplyLength } from "#engagement/domain/reply-text.ts";
import {
  ReplyDoubtSchema,
  ReplyFailureSchema,
  replyKeyLifetime,
  ReplyStatusSchema,
} from "#engagement/domain/reply.ts";
import { CollectionEndSchema } from "#engagement/domain/thread.ts";
import { InboxMessagePlatformSchema } from "#shared/domain/inbox-message-platform.ts";

// The contract copies the engagement context's vocabulary and figures, for
// clients that cannot import the server: change them together.
describe("the contract's inbox", () => {
  it("keeps a reply's idempotency key as long as the contract says", () => {
    expect(Duration.toHours(replyKeyLifetime)).toBe(
      idempotencyKeyLifetimeHours
    );
  });

  it("names the abilities and their standings as the domain does", () => {
    expect(InboxAbilitySchema.literals).toStrictEqual(
      EngagementAbilitySchema.literals
    );
    expect(InboxAbilityStandingSchema.literals).toStrictEqual(
      AbilityStandingSchema.literals
    );
  });

  it("names a comment's states and what is asked about one", () => {
    expect(InboxCommentStateSchema.literals).toStrictEqual(
      CommentStateSchema.literals
    );
    expect(InboxModerationActionSchema.literals).toStrictEqual(
      ModerationActionSchema.literals
    );
  });

  it("names a reply's statuses and reasons", () => {
    expect(InboxReplyStatusSchema.literals).toStrictEqual(
      ReplyStatusSchema.members.map(
        (member) => member.fields._tag.schema.literal
      )
    );
    expect(InboxReplyReasonSchema.literals).toStrictEqual([
      ...ReplyFailureSchema.literals,
      ...ReplyDoubtSchema.literals,
    ]);
  });

  it("names why a thread is no longer read", () => {
    expect(InboxCollectionEndSchema.literals).toStrictEqual(
      CollectionEndSchema.literals
    );
  });

  it("gives the platforms, the window, the retention and the limits", () => {
    expect(inboxPlatforms).toStrictEqual(engagedPlatforms);
    expect(inboxWindowDays).toBe(Duration.toDays(defaultWindow));
    expect(inboxRetentionDays).toBe(Duration.toDays(keptAfterCollection));
    expect(maxInboxReplyLength).toBe(maxReplyLength);
    expect(maxInboxPageSize).toBe(maxThreadsPerPage);
  });
});

describe("the contract's direct messages", () => {
  it("names the platforms, the retention and the longest message as the domain does", () => {
    expect([...inboxMessagePlatforms]).toStrictEqual(
      InboxMessagePlatformSchema.literals
    );
    expect(Duration.toDays(conversationsKeptFor)).toBe(
      inboxMessageRetentionDays
    );
    expect(maxInboxMessageLength).toBe(maxOutgoingMessageLength);
    expect(Duration.toHours(messageKeyLifetime)).toBe(
      idempotencyKeyLifetimeHours
    );
  });

  it("names a message's states and reasons as the domain does", () => {
    expect(InboxOutgoingMessageStatusSchema.literals).toStrictEqual(
      OutgoingMessageStatusSchema.members.map(
        ({ fields }) => fields._tag.schema.literal
      )
    );
    expect(InboxOutgoingMessageReasonSchema.literals).toStrictEqual([
      ...MessageFailureSchema.literals,
      ...ReplyDoubtSchema.literals,
    ]);
    expect(InboxMessageAbilitiesSchema.fields).toHaveProperty("send");
    expect(Object.keys(InboxMessageAbilitiesSchema.fields)).toStrictEqual(
      MessageAbilitySchema.literals
    );
  });
});
