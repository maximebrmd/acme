import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Result } from "effect";

import { Notify } from "#notifications/application/notify.ts";
import type { NoticeRequest } from "#notifications/application/notify.ts";
import { FollowUpNotices } from "#publishing/application/follow-up-notices.ts";
import { FollowUpIdSchema } from "#publishing/domain/follow-up-id.ts";
import { FollowUpRuleIdSchema } from "#publishing/domain/follow-up-rule-id.ts";
import { startFollowUpRule } from "#publishing/domain/follow-up-rule.ts";
import { armFollowUp, expireFollowUp } from "#publishing/domain/follow-up.ts";
import type { FollowUp } from "#publishing/domain/follow-up.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { NotifiedFollowUpNotices } from "#publishing/infrastructure/notified-follow-up-notices.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";

// What the notifications context is asked to tell of follow-up rules: the
// event, its key, and the rule's starter as the author.

const at = DateTime.makeUnsafe("2026-07-08T09:30:00Z");

const workspaceId = WorkspaceIdSchema.make(
  "0b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"
);

const starter = UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

const rule = startFollowUpRule(
  {
    comment: Option.some("Thank you all for reading!"),
    id: FollowUpRuleIdSchema.make("00000000-0000-7000-8000-00000000f001"),
    likes: 10,
    needsApproval: false,
    repost: true,
    scope: {
      _tag: "channel",
      channelId: ChannelIdSchema.make("00000000-0000-7000-8000-000000000101"),
    },
    startedBy: Option.some(starter),
    startedVia: { _tag: "web" },
    workspaceId,
  },
  at
);

const expired = (n: number, reason: "windowEnded" | "notGranted"): FollowUp =>
  expireFollowUp(
    armFollowUp(
      {
        channelId: ChannelIdSchema.make("00000000-0000-7000-8000-000000000101"),
        id: FollowUpIdSchema.make(`00000000-0000-7000-8000-00000000040${n}`),
        kind: "comment",
        postId: PostIdSchema.make("00000000-0000-7000-8000-000000000201"),
        ruleId: rule.id,
        targetId: PostTargetIdSchema.make(
          `00000000-0000-7000-8000-00000000050${n}`
        ),
        until: at,
        workspaceId,
      },
      at
    ),
    reason,
    at
  ).pipe(Result.getOrThrow);

const told = (
  run: (notices: FollowUpNotices["Service"]) => Effect.Effect<void, unknown>
) =>
  Effect.gen(function* telling() {
    const requests: NoticeRequest[] = [];

    yield* FollowUpNotices.use(run).pipe(
      Effect.provide(
        NotifiedFollowUpNotices.pipe(
          Layer.provide(
            Layer.succeed(
              Notify,
              Notify.of({
                notify: (request) =>
                  Effect.sync(() => {
                    requests.push(request);
                  }),
                resolve: () => Effect.void,
              })
            )
          )
        )
      )
    );

    return requests;
  });

describe("the follow-up rules' notices", () => {
  it.effect(
    "tells follow-ups not sent once a rule and UTC day, with a count and each reason once",
    () =>
      Effect.gen(function* notSent() {
        const requests = yield* told((notices) =>
          notices.notSent(
            rule,
            [
              expired(1, "notGranted"),
              expired(2, "windowEnded"),
              expired(3, "notGranted"),
            ],
            at
          )
        );

        assert.deepStrictEqual(requests, [
          {
            author: starter,
            event: {
              _tag: "FollowUpsNotSent",
              count: 3,
              reasons: ["windowEnded", "notGranted"],
              ruleId: rule.id,
            },
            key: `follow-ups-not-sent:${rule.id}:2026-07-08`,
            workspaceId,
          },
        ]);
      })
  );

  it.effect(
    "tells a rule that stopped by itself once, and nothing for no follow-up",
    () =>
      Effect.gen(function* stopped() {
        const requests = yield* told((notices) =>
          notices
            .stopped(rule, "starterGone")
            .pipe(Effect.andThen(notices.notSent(rule, [], at)))
        );

        assert.deepStrictEqual(requests, [
          {
            author: starter,
            event: {
              _tag: "FollowUpRuleStopped",
              reason: "starterGone",
              ruleId: rule.id,
            },
            key: `follow-up-rule:${rule.id}:stopped`,
            workspaceId,
          },
        ]);
      })
  );
});
