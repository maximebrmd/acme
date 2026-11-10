import { describe, expect, it } from "@effect/vitest";
import { Duration } from "effect";
import {
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
import {
  AbilityStandingSchema,
  engagedPlatforms,
  EngagementAbilitySchema,
} from "#engagement/domain/engagement-abilities.ts";
import { keptAfterCollection } from "#engagement/domain/engagement-retention.ts";
import { ModerationActionSchema } from "#engagement/domain/moderation.ts";
import { maxReplyLength } from "#engagement/domain/reply-text.ts";
import {
  ReplyDoubtSchema,
  ReplyFailureSchema,
  ReplyStatusSchema,
} from "#engagement/domain/reply.ts";
import { CollectionEndSchema } from "#engagement/domain/thread.ts";

// The contract copies the engagement context's vocabulary and figures, for
// clients that cannot import the server: change them together.
describe("the contract's inbox", () => {
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
