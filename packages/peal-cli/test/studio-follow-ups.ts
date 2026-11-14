import { Effect, Option, Ref } from "effect";
import type { DateTime } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  FollowUpNotPossible,
  FollowUpRuleEnded,
  FollowUpRuleNotFound,
  FollowUpRuleTaken,
  Forbidden,
  PostNotFound,
} from "peal-contract";
import type {
  ChannelFollowUps,
  CurrentMember,
  FollowUpRule,
  Post,
} from "peal-contract";

import type { Studio } from "./studio.ts";

// The studio's follow-up rules. What each channel can carry is its
// platform's alone (Mastodon and Bluesky both kinds, X the comment): the
// server's own tests cover the rest. Rules are kept per studio, beside
// what the rest of it holds.

/** What the rules take of the studio, which hands it over. */
export interface FollowUpsWorld {
  readonly allowed: (
    permission: "post:approve" | "post:read" | "post:schedule"
  ) => Effect.Effect<unknown, Forbidden, CurrentMember>;
  readonly channelPlatform: (
    channelId: string
  ) => Option.Option<ChannelFollowUps["platform"]>;
  readonly now: DateTime.Utc;
  readonly posts: (studio: Studio) => Effect.Effect<readonly Post[]>;
  readonly record: (studio: Studio, change: string) => Effect.Effect<void>;
  readonly workspaceId: string;
}

const kept = new WeakMap<Studio, Ref.Ref<readonly FollowUpRule[]>>();

const rulesOf = (studio: Studio) => {
  const found = kept.get(studio);

  if (found !== undefined) {
    return found;
  }

  const made = Ref.makeUnsafe<readonly FollowUpRule[]>([]);

  kept.set(studio, made);

  return made;
};

const comments = new Set(["bluesky", "mastodon", "x"]);
const reposts = new Set(["bluesky", "mastodon"]);

const abilityOf = (
  platform: string,
  asked: boolean,
  carriers: ReadonlySet<string>
): ChannelFollowUps["comment"] => {
  if (!asked) {
    return "notAsked";
  }

  return carriers.has(platform) ? "available" : "notBuilt";
};

const pausedAs = (
  status: FollowUpRule["status"],
  paused: boolean | undefined
): FollowUpRule["status"] => {
  if (paused === undefined) {
    return status;
  }

  return paused ? "paused" : "active";
};

const ruleIn = (studio: Studio, ruleId: string) =>
  Ref.get(rulesOf(studio)).pipe(
    Effect.flatMap((rules) =>
      Option.match(
        Option.fromUndefinedOr(rules.find(({ id }) => id === ruleId)),
        {
          onNone: () => Effect.fail(new FollowUpRuleNotFound()),
          onSome: Effect.succeed,
        }
      )
    )
  );

const open = (rule: FollowUpRule) =>
  rule.status === "ended"
    ? Effect.fail(
        new FollowUpRuleEnded({ reason: rule.endedReason ?? "stopped" })
      )
    : Effect.succeed(rule);

/** The studio's follow-ups group, over what the rest of it holds. */
export const studioFollowUpsOf = (world: FollowUpsWorld) => {
  const inWorkspace = (workspaceId: string) =>
    workspaceId === world.workspaceId
      ? Effect.void
      : Effect.fail(new Forbidden());

  const channelsOf = (
    channelIds: readonly string[],
    comment: string | null,
    repost: boolean
  ): readonly ChannelFollowUps[] =>
    channelIds.flatMap((channelId) =>
      Option.toArray(world.channelPlatform(channelId)).map((platform) => ({
        channelId,
        comment: abilityOf(platform, comment !== null, comments),
        platform,
        repost: abilityOf(platform, repost, reposts),
      }))
    );

  const saved = (studio: Studio, rule: FollowUpRule, change: string) =>
    Ref.update(rulesOf(studio), (rules) =>
      rules.map((one) => (one.id === rule.id ? rule : one))
    ).pipe(Effect.andThen(world.record(studio, change)), Effect.as(rule));

  const groupLive = (studio: Studio) =>
    HttpApiBuilder.group(Api, "followUps", (handlers) =>
      handlers.handleAll({
        approve: ({ params }) =>
          Effect.gen(function* approve() {
            yield* world.allowed("post:approve");
            yield* inWorkspace(params.workspaceId);

            const rule = yield* open(yield* ruleIn(studio, params.ruleId));

            return yield* saved(
              studio,
              rule.approval === "pending"
                ? {
                    ...rule,
                    approval: "approved",
                    approvedAt: world.now,
                    approvedBy: studio.me.user.id,
                  }
                : rule,
              `followUps.approve ${rule.id}`
            );
          }),
        create: ({ params, payload }) =>
          Effect.gen(function* create() {
            yield* world.allowed("post:schedule");
            yield* inWorkspace(params.workspaceId);

            const posts = yield* world.posts(studio);
            const comment = payload.comment ?? null;
            const repost = payload.repost ?? false;

            if (comment === null && !repost) {
              return yield* new FollowUpNotPossible({
                channels: [],
                reason: "noAction",
              });
            }

            const post =
              payload.postId === undefined
                ? Option.none<Post>()
                : Option.fromUndefinedOr(
                    posts.find(({ id }) => id === payload.postId)
                  );

            if (payload.postId !== undefined && Option.isNone(post)) {
              return yield* new PostNotFound();
            }

            const channelIds = Option.match(post, {
              onNone: () =>
                Option.toArray(Option.fromUndefinedOr(payload.channelId)),
              onSome: ({ targets }) =>
                targets.map(({ channelId }) => channelId),
            });

            const channels = channelsOf(channelIds, comment, repost);

            if (
              !channels.some(
                (channel) =>
                  channel.comment === "available" ||
                  channel.repost === "available"
              )
            ) {
              return yield* new FollowUpNotPossible({
                channels,
                reason: channels.length === 0 ? "noChannel" : "channels",
              });
            }

            const rules = yield* Ref.get(rulesOf(studio));

            const taken = rules.find(
              (rule) =>
                rule.status !== "ended" &&
                rule.postId === (payload.postId ?? null) &&
                rule.channelId === (payload.channelId ?? null)
            );

            if (taken !== undefined) {
              return yield* new FollowUpRuleTaken({ ruleId: taken.id });
            }

            const rule: FollowUpRule = {
              approval: "notNeeded",
              approvedAt: null,
              approvedBy: null,
              channelId: payload.channelId ?? null,
              channels,
              comment,
              createdAt: world.now,
              endedReason: null,
              followUps: [],
              id: `0190f3a0-0000-7000-8000-0000000f${String(rules.length + 1).padStart(4, "0")}`,
              likes: payload.likes,
              postId: payload.postId ?? null,
              repost,
              startedBy: studio.me.user.id,
              startedVia: { id: null, name: null, via: "web" },
              status: "active",
            };

            yield* Ref.update(rulesOf(studio), (all) => [...all, rule]);
            yield* world.record(studio, `followUps.create ${rule.id}`);

            return rule;
          }),
        delete: ({ params }) =>
          Effect.gen(function* stop() {
            yield* world.allowed("post:schedule");
            yield* inWorkspace(params.workspaceId);

            const rule = yield* ruleIn(studio, params.ruleId);

            if (rule.status !== "ended") {
              yield* saved(
                studio,
                { ...rule, endedReason: "stopped", status: "ended" },
                `followUps.delete ${rule.id}`
              );
            }
          }),
        get: ({ params }) =>
          Effect.gen(function* get() {
            yield* world.allowed("post:read");
            yield* inWorkspace(params.workspaceId);

            return yield* ruleIn(studio, params.ruleId);
          }),
        list: ({ params, query }) =>
          Effect.gen(function* list() {
            yield* world.allowed("post:read");
            yield* inWorkspace(params.workspaceId);

            if (query.cursor !== undefined && query.cursor.length === 0) {
              return yield* new HttpApiError.BadRequest();
            }

            const rules = yield* Ref.get(rulesOf(studio));

            return {
              items: rules.filter(
                (rule) =>
                  (query.status === undefined ||
                    rule.status === query.status) &&
                  (query.postId === undefined || rule.postId === query.postId)
              ),
              nextCursor: null,
            };
          }),
        update: ({ params, payload }) =>
          Effect.gen(function* update() {
            yield* world.allowed("post:schedule");
            yield* inWorkspace(params.workspaceId);

            const rule = yield* open(yield* ruleIn(studio, params.ruleId));

            const paused = pausedAs(rule.status, payload.paused);

            return yield* saved(
              studio,
              {
                ...rule,
                comment:
                  payload.comment === undefined
                    ? rule.comment
                    : payload.comment,
                likes: payload.likes ?? rule.likes,
                repost: payload.repost ?? rule.repost,
                status: paused,
              },
              `followUps.update ${rule.id}`
            );
          }),
      })
    );

  return { groupLive };
};
