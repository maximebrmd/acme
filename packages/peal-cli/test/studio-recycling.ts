import { DateTime, Effect, Option, Ref } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  Forbidden,
  PostNotFound,
  PostNotRecyclable,
  RecyclingRuleEnded,
  RecyclingRuleNotFound,
} from "peal-contract";
import type {
  CurrentMember,
  Post,
  RecyclingInterval,
  RecyclingRule,
} from "peal-contract";

import type { Studio } from "./studio.ts";

// The studio's recycling rules, which make a post repeat. Their due
// instants are counted in days of 24 hours from the source's time, which
// is enough for the commands' tests: the server's own tests cover zones,
// months and daylight saving.

/** What the rules take of the studio, which hands it over. */
export interface RecyclingWorld {
  readonly allowed: (
    permission: "post:read" | "post:schedule"
  ) => Effect.Effect<unknown, Forbidden, CurrentMember>;
  readonly now: DateTime.Utc;
  readonly record: (studio: Studio, change: string) => Effect.Effect<void>;
  readonly workspaceId: string;
}

const days: Readonly<Record<RecyclingInterval["unit"], number>> = {
  days: 1,
  months: 30,
  weeks: 7,
};

const later = (at: DateTime.Utc, every: RecyclingInterval, steps: number) =>
  DateTime.add(at, { days: days[every.unit] * every.count * steps });

// The next three posts to come, from the one planned.
const comingOf = (rule: RecyclingRule): RecyclingRule["coming"] =>
  rule.nextDueAt === null
    ? []
    : [0, 1, 2].flatMap((step) => {
        const occurrence = rule.made + 1 + step;
        const turn = (occurrence - 1) % (rule.variants.length + 1);

        return occurrence > (rule.count ?? 100)
          ? []
          : [
              {
                at: later(rule.nextDueAt ?? rule.anchorAt, rule.every, step),
                occurrence,
                variant: turn === 0 ? null : turn,
              },
            ];
      });

const pausedOrActive = (paused: boolean) =>
  paused ? ("paused" as const) : ("active" as const);

const withComing = (rule: RecyclingRule): RecyclingRule => ({
  ...rule,
  coming: comingOf(rule),
});

const ruleIn = (studio: Studio, ruleId: string) =>
  Ref.get(studio.state).pipe(
    Effect.flatMap(({ recyclingRules }) =>
      Option.match(
        Option.fromUndefinedOr(recyclingRules.find(({ id }) => id === ruleId)),
        {
          onNone: () => Effect.fail(new RecyclingRuleNotFound()),
          onSome: Effect.succeed,
        }
      )
    )
  );

const sourceOf = (posts: readonly Post[], postId: string) =>
  Option.fromUndefinedOr(posts.find(({ id }) => id === postId));

/** The studio's recycling group, over what the rest of it holds. */
export const studioRecyclingOf = (world: RecyclingWorld) => {
  const inWorkspace = (workspaceId: string) =>
    workspaceId === world.workspaceId
      ? Effect.void
      : Effect.fail(new Forbidden());

  const saved = (studio: Studio, rule: RecyclingRule, change: string) =>
    Ref.update(studio.state, (current) => ({
      ...current,
      recyclingRules: current.recyclingRules.map((kept) =>
        kept.id === rule.id ? rule : kept
      ),
    })).pipe(
      Effect.andThen(world.record(studio, change)),
      Effect.as(withComing(rule))
    );

  const groupLive = (studio: Studio) =>
    HttpApiBuilder.group(Api, "recycling", (handlers) =>
      handlers.handleAll({
        create: ({ params, payload }) =>
          Effect.gen(function* create() {
            yield* world.allowed("post:schedule");
            yield* inWorkspace(params.workspaceId);

            const { posts, recyclingRules } = yield* Ref.get(studio.state);
            const source = sourceOf(posts, payload.postId);

            if (Option.isNone(source)) {
              return yield* new PostNotFound();
            }

            const { schedule, status } = source.value;

            if (
              status === "draft" ||
              status === "awaitingApproval" ||
              status === "cancelled"
            ) {
              return yield* new PostNotRecyclable({
                postId: payload.postId,
                reason: status,
              });
            }

            if (schedule === null) {
              return yield* new PostNotRecyclable({
                postId: payload.postId,
                reason: "draft",
              });
            }

            if (
              recyclingRules.some(
                (rule) =>
                  rule.sourcePostId === payload.postId &&
                  rule.status !== "ended"
              )
            ) {
              return yield* new PostNotRecyclable({
                postId: payload.postId,
                reason: "repeating",
              });
            }

            const rule: RecyclingRule = {
              anchorAt: schedule.at,
              coming: [],
              count: payload.count ?? null,
              createdAt: world.now,
              endedReason: null,
              every: payload.every,
              id: `0190f3a0-0000-7000-8000-0000000ec${String(recyclingRules.length + 1).padStart(3, "0")}`,
              lastDueAt: schedule.at,
              made: 1,
              nextDueAt: later(schedule.at, payload.every, 1),
              queueId: payload.queueId ?? null,
              sourcePostId: payload.postId,
              startedBy: "synthetic-member",
              startedVia: { id: null, name: null, via: "application" },
              status: "active",
              timeZone: schedule.timeZone,
              until: payload.until ?? null,
              variants: (payload.variants ?? []).map(
                ({ overrides = [], text }) => ({ overrides, text })
              ),
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              recyclingRules: [...current.recyclingRules, rule],
            }));
            yield* world.record(studio, `recycling:create:${rule.id}`);

            return withComing(rule);
          }),
        delete: ({ params }) =>
          Effect.gen(function* stop() {
            yield* world.allowed("post:schedule");
            yield* inWorkspace(params.workspaceId);

            const rule = yield* ruleIn(studio, params.ruleId);

            yield* saved(
              studio,
              rule.status === "ended"
                ? rule
                : {
                    ...rule,
                    endedReason: "stopped",
                    nextDueAt: null,
                    status: "ended",
                  },
              `recycling:stop:${rule.id}`
            );
          }),
        get: ({ params }) =>
          Effect.gen(function* get() {
            yield* world.allowed("post:read");
            yield* inWorkspace(params.workspaceId);

            return withComing(yield* ruleIn(studio, params.ruleId));
          }),
        list: ({ params, query }) =>
          Effect.gen(function* list() {
            yield* world.allowed("post:read");
            yield* inWorkspace(params.workspaceId);

            const { recyclingRules } = yield* Ref.get(studio.state);

            const listed = recyclingRules.filter(
              ({ status }) =>
                query.status === undefined || status === query.status
            );

            // Oldest first, from the rule after the cursor's.
            const from =
              query.cursor === undefined
                ? 0
                : listed.findIndex(({ id }) => id === query.cursor) + 1;

            const limit = query.limit ?? 50;
            const page = listed.slice(from, from + limit);

            return {
              items: page.map(withComing),
              nextCursor:
                from + limit < listed.length ? (page.at(-1)?.id ?? null) : null,
            };
          }),
        resume: ({ params, payload }) =>
          Effect.gen(function* resume() {
            yield* world.allowed("post:schedule");
            yield* inWorkspace(params.workspaceId);

            const rule = yield* ruleIn(studio, params.ruleId);

            if (rule.status === "ended" && rule.endedReason === "stopped") {
              return yield* new RecyclingRuleEnded({ reason: "stopped" });
            }

            return yield* saved(
              studio,
              {
                ...rule,
                endedReason: null,
                nextDueAt: later(world.now, rule.every, 1),
                status: "active",
                variants:
                  payload.variants === undefined
                    ? rule.variants
                    : payload.variants.map(({ overrides = [], text }) => ({
                        overrides,
                        text,
                      })),
              },
              `recycling:resume:${rule.id}`
            );
          }),
        update: ({ params, payload }) =>
          Effect.gen(function* update() {
            yield* world.allowed("post:schedule");
            yield* inWorkspace(params.workspaceId);

            const rule = yield* ruleIn(studio, params.ruleId);

            if (rule.status === "ended") {
              return yield* new RecyclingRuleEnded({
                reason: rule.endedReason ?? "stopped",
              });
            }

            const status =
              payload.paused === undefined
                ? rule.status
                : pausedOrActive(payload.paused);

            return yield* saved(
              studio,
              {
                ...rule,
                count: payload.count === undefined ? rule.count : payload.count,
                status,
                until: payload.until === undefined ? rule.until : payload.until,
                variants:
                  payload.variants === undefined
                    ? rule.variants
                    : payload.variants.map(({ overrides = [], text }) => ({
                        overrides,
                        text,
                      })),
              },
              `recycling:update:${rule.id}`
            );
          }),
      })
    );

  return { groupLive };
};
