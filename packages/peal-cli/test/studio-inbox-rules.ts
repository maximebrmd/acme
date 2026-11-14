import { Effect, Option, Ref } from "effect";
import type { DateTime } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  CommentRuleEnded,
  CommentRuleNotFound,
  CommentRuleNotPossible,
  Forbidden,
} from "peal-contract";
import type { CommentRule, CurrentMember } from "peal-contract";

import type { Studio } from "./studio.ts";

// The studio's comment rules. A channel carries a reply on Mastodon
// alone here: the server's own tests cover the platforms.

export interface InboxRulesWorld {
  readonly allowed: (
    permission: "engagement:read" | "engagement:reply"
  ) => Effect.Effect<unknown, Forbidden, CurrentMember>;
  readonly channelPlatform: (
    channelId: string
  ) => Option.Option<CommentRule["channels"][number]["platform"]>;
  readonly now: DateTime.Utc;
  readonly record: (studio: Studio, change: string) => Effect.Effect<void>;
  readonly workspaceId: string;
}

const kept = new WeakMap<Studio, Ref.Ref<readonly CommentRule[]>>();

const rulesOf = (studio: Studio) => {
  const found = kept.get(studio);

  if (found !== undefined) {
    return found;
  }

  const made = Ref.makeUnsafe<readonly CommentRule[]>([]);

  kept.set(studio, made);

  return made;
};

const ruleIn = (studio: Studio, ruleId: string) =>
  Ref.get(rulesOf(studio)).pipe(
    Effect.flatMap((rules) =>
      Option.match(
        Option.fromUndefinedOr(rules.find(({ id }) => id === ruleId)),
        {
          onNone: () => Effect.fail(new CommentRuleNotFound()),
          onSome: Effect.succeed,
        }
      )
    )
  );

const pausedAs = (
  status: CommentRule["status"],
  paused: boolean | undefined
): CommentRule["status"] => {
  if (paused === undefined) {
    return status;
  }

  return paused ? "paused" : "active";
};

/** The studio's inbox rules group. */
export const studioInboxRulesOf = (world: InboxRulesWorld) => {
  const inWorkspace = (workspaceId: string) =>
    workspaceId === world.workspaceId
      ? Effect.void
      : Effect.fail(new Forbidden());

  const saved = (studio: Studio, rule: CommentRule, change: string) =>
    Ref.update(rulesOf(studio), (rules) =>
      rules.map((one) => (one.id === rule.id ? rule : one))
    ).pipe(Effect.andThen(world.record(studio, change)), Effect.as(rule));

  const groupLive = (studio: Studio) =>
    HttpApiBuilder.group(Api, "inboxRules", (handlers) =>
      handlers.handleAll({
        createCommentRule: ({ params, payload }) =>
          Effect.gen(function* create() {
            yield* world.allowed("engagement:reply");
            yield* inWorkspace(params.workspaceId);

            const channelId = payload.channelId ?? "";

            const channels = Option.toArray(
              world.channelPlatform(channelId)
            ).map((platform) => ({
              channelId,
              platform,
              reply:
                platform === "mastodon"
                  ? ("available" as const)
                  : ("notAllowed" as const),
            }));

            if (!channels.some(({ reply }) => reply === "available")) {
              return yield* new CommentRuleNotPossible({
                channels,
                reason: channels.length === 0 ? "noChannel" : "channels",
              });
            }

            const rules = yield* Ref.get(rulesOf(studio));

            const rule: CommentRule = {
              channelId: payload.channelId ?? null,
              channels,
              createdAt: world.now,
              endedReason: null,
              id: `0190f3a0-0000-7000-8000-0000000c${String(rules.length + 1).padStart(4, "0")}`,
              keywords: payload.keywords.map((keyword) =>
                keyword.toLowerCase()
              ),
              matches: [],
              postId: payload.postId ?? null,
              reply: payload.reply,
              startedBy: studio.me.user.id,
              status: "active",
            };

            yield* Ref.update(rulesOf(studio), (all) => [...all, rule]);
            yield* world.record(studio, `inboxRules.create ${rule.id}`);

            return rule;
          }),
        deleteCommentRule: ({ params }) =>
          Effect.gen(function* stop() {
            yield* world.allowed("engagement:reply");
            yield* inWorkspace(params.workspaceId);

            const rule = yield* ruleIn(studio, params.ruleId);

            yield* saved(
              studio,
              { ...rule, endedReason: "stopped", status: "ended" },
              `inboxRules.delete ${rule.id}`
            );
          }),
        getCommentRule: ({ params }) =>
          Effect.gen(function* get() {
            yield* world.allowed("engagement:read");
            yield* inWorkspace(params.workspaceId);

            return yield* ruleIn(studio, params.ruleId);
          }),
        listCommentRules: ({ params, query }) =>
          Effect.gen(function* list() {
            yield* world.allowed("engagement:read");
            yield* inWorkspace(params.workspaceId);

            const rules = yield* Ref.get(rulesOf(studio));

            return {
              items: rules.filter(
                (rule) =>
                  query.status === undefined || rule.status === query.status
              ),
              nextCursor: null,
            };
          }),
        updateCommentRule: ({ params, payload }) =>
          Effect.gen(function* update() {
            yield* world.allowed("engagement:reply");
            yield* inWorkspace(params.workspaceId);

            const rule = yield* ruleIn(studio, params.ruleId);

            if (rule.status === "ended") {
              return yield* new CommentRuleEnded({
                reason: rule.endedReason ?? "stopped",
              });
            }

            return yield* saved(
              studio,
              {
                ...rule,
                keywords: payload.keywords ?? rule.keywords,
                reply: payload.reply ?? rule.reply,
                status: pausedAs(rule.status, payload.paused),
              },
              `inboxRules.update ${rule.id}`
            );
          }),
      })
    );

  return { groupLive };
};
