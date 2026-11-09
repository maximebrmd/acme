import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration, Option, Result } from "effect";

import {
  completableBy,
  connectAttemptLifetime,
  startAttempt,
} from "#channels/domain/connect-attempt.ts";
import { Actor } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

const workspaceId = WorkspaceIdSchema.make(
  "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"
);

const otherWorkspace = WorkspaceIdSchema.make(
  "6c2d6f8e-4e3b-4d2c-8f9e-8b7c6d5e4f3a"
);

const member = (userId: string, workspace = workspaceId) =>
  new Actor({
    permissions: ["channel:connect"],
    subject: {
      _tag: "user",
      impersonatedBy: Option.none(),
      userId: UserIdSchema.make(userId),
    },
    workspaceId: workspace,
  });

const ada = member("1a2b3c4d-1a2b-4c3d-8e9f-0a1b2c3d4e5f");

const startedAt = DateTime.makeUnsafe("2026-11-09T10:00:00Z");

const attempt = startAttempt(
  {
    actor: ada,
    channelId: Option.none(),
    connection: Option.none(),
    instance: Option.some("https://mastodon.example"),
    platform: "mastodon",
    state: "state-1",
  },
  startedAt
);

describe(completableBy, () => {
  it("lets its starter complete it, for its platform, in time", () => {
    expect(completableBy(attempt, ada, "mastodon", startedAt)).toStrictEqual(
      Result.succeed(attempt)
    );
    expect(attempt.expiresAt).toStrictEqual(
      DateTime.addDuration(startedAt, connectAttemptLifetime)
    );
  });

  it.each([
    {
      actor: member("2b3c4d5e-2b3c-4d5e-9f0a-1b2c3d4e5f6a"),
      label: "another member",
      platform: "mastodon" as const,
      when: startedAt,
    },
    {
      actor: member("1a2b3c4d-1a2b-4c3d-8e9f-0a1b2c3d4e5f", otherWorkspace),
      label: "the starter in another workspace",
      platform: "mastodon" as const,
      when: startedAt,
    },
    {
      actor: ada,
      label: "another platform",
      platform: "bluesky" as const,
      when: startedAt,
    },
    {
      actor: ada,
      label: "an expired attempt",
      platform: "mastodon" as const,
      when: DateTime.addDuration(startedAt, Duration.minutes(15)),
    },
  ])("refuses $label", ({ actor, platform, when }) => {
    expect(
      Result.isFailure(completableBy(attempt, actor, platform, when))
    ).toBeTruthy();
  });
});
