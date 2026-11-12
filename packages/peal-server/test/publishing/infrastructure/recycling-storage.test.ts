import { readFile } from "node:fs/promises";
import path from "node:path";

import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Exit, Layer, Option, Result, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { PostRepository } from "#publishing/application/post-repository.ts";
import { RecyclingStore } from "#publishing/application/recycling-store.ts";
import { emptyContent } from "#publishing/domain/post-content.ts";
import { PostOriginSchema } from "#publishing/domain/post-origin.ts";
import { createDraft, madeBy } from "#publishing/domain/post.ts";
import { RecyclingRuleIdSchema } from "#publishing/domain/recycling-rule-id.ts";
import { endRule, startRule } from "#publishing/domain/recycling-rule.ts";
import { RecyclingVariant } from "#publishing/domain/recycling-variant.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { DrizzleRecyclingStore } from "#publishing/infrastructure/drizzle-recycling-store.ts";
import { newId } from "#shared/application/ids.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// What a recycling rule keeps, and the columns it gives its posts. A post
// row from before rules is no occurrence; a rule's origin is the post
// origin's persisted shape (`fixtures/persisted/posts/origins.json`).

const StorageTest = Layer.mergeAll(
  DrizzlePostRepository,
  DrizzleRecyclingStore
).pipe(Layer.provideMerge(DatabaseTest));

const origins = path.join(
  import.meta.dirname,
  "fixtures",
  "persisted",
  "posts",
  "origins.json"
);

const paris = TimeZoneIdSchema.make("Europe/Paris");
const now = DateTime.makeUnsafe("2026-06-15T08:00:00Z");

const web: typeof PostOriginSchema.Type = { _tag: "web" };

const cleared = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use((sql) =>
    sql`DELETE FROM publishing.recycling_rules WHERE workspace_id = ${workspaceId}`.pipe(
      Effect.andThen(
        sql`DELETE FROM publishing.posts WHERE workspace_id = ${workspaceId}`
      )
    )
  ).pipe(Effect.orDie);

const ruleOf = (
  workspaceId: WorkspaceId,
  sourcePostId: PostId,
  startedVia: typeof PostOriginSchema.Type
) =>
  newId(RecyclingRuleIdSchema).pipe(
    Effect.map((id) =>
      Result.getOrThrow(
        startRule(
          {
            anchorAt: DateTime.makeUnsafe("2026-06-15T07:00:00Z"),
            count: Option.some(5),
            id,
            interval: { count: 2, unit: "weeks" },
            queueId: Option.none(),
            sourcePostId,
            startedBy: Option.none(),
            startedVia,
            timeZone: paris,
            until: Option.some({ day: 31, month: 12, year: 2026 }),
            variants: [
              new RecyclingVariant({ overrides: [], text: "A second take" }),
            ],
            workspaceId,
          },
          now
        )
      )
    )
  );

layer(StorageTest)("a recycling rule's storage", (it) => {
  it.effect("reads a post row from before rules as no occurrence", () =>
    Effect.gen(function* olderRow() {
      const sql = yield* SqlClient.SqlClient;
      const workspaceId = yield* freshWorkspace;
      const postId = yield* newId(PostIdSchema);

      yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text) VALUES (${postId}, ${workspaceId}, 'draft', 'A synthetic post')`;

      const stored = yield* PostRepository.use((posts) =>
        posts.find(postId)
      ).pipe(Effect.ensuring(cleared(workspaceId)));

      assert.deepStrictEqual(
        stored.pipe(Option.map(({ post }) => post.occurrence)),
        Option.some(Option.none())
      );
    })
  );

  it.effect("keeps a post's occurrence, and each occurrence once", () =>
    Effect.gen(function* occurrences() {
      const posts = yield* PostRepository;
      const workspaceId = yield* freshWorkspace;
      const ruleId = yield* newId(RecyclingRuleIdSchema);

      const occurrenceOf = (postId: PostId) =>
        madeBy(createDraft(postId, workspaceId, emptyContent, Option.none()), {
          number: 2,
          ruleId,
        });

      const first = occurrenceOf(yield* newId(PostIdSchema));

      yield* Effect.gen(function* checks() {
        yield* posts.insert(first, []);

        const again = yield* posts
          .insert(occurrenceOf(yield* newId(PostIdSchema)), [])
          .pipe(Effect.exit);

        const stored = yield* posts.find(first.id);

        assert.deepStrictEqual(
          stored.pipe(Option.flatMap(({ post }) => post.occurrence)),
          Option.some({ number: 2, ruleId })
        );
        assert.isTrue(Exit.isFailure(again));
      }).pipe(Effect.ensuring(cleared(workspaceId)));
    })
  );

  it.effect("keeps a rule as the domain made it, and what changes of it", () =>
    Effect.gen(function* roundTrip() {
      const store = yield* RecyclingStore;
      const workspaceId = yield* freshWorkspace;
      const rule = yield* ruleOf(workspaceId, yield* newId(PostIdSchema), web);

      yield* Effect.gen(function* checks() {
        yield* store.insert(rule);

        assert.deepStrictEqual(
          yield* store.byId(workspaceId, rule.id),
          Option.some(rule)
        );
        assert.deepStrictEqual(
          yield* store.ofSource(workspaceId, rule.sourcePostId),
          Option.some(rule)
        );
        assert.strictEqual(yield* store.countLive(workspaceId), 1);

        const ended = endRule(rule, "planLimit", now);

        yield* store.update(ended);

        assert.deepStrictEqual(
          yield* store.byId(workspaceId, rule.id),
          Option.some(ended)
        );
        assert.strictEqual(yield* store.countLive(workspaceId), 0);
      }).pipe(Effect.ensuring(cleared(workspaceId)));
    })
  );

  it.effect("keeps one rule going on per source", () =>
    Effect.gen(function* oneRule() {
      const store = yield* RecyclingStore;
      const workspaceId = yield* freshWorkspace;
      const source = yield* newId(PostIdSchema);
      const first = yield* ruleOf(workspaceId, source, web);

      yield* Effect.gen(function* checks() {
        yield* store.insert(first);

        const second = yield* store
          .insert(yield* ruleOf(workspaceId, source, web))
          .pipe(Effect.exit);

        assert.isTrue(Exit.isFailure(second));

        // Once the first ended, the source may start another.
        yield* store.update(endRule(first, "stopped", now));
        yield* store.insert(yield* ruleOf(workspaceId, source, web));

        assert.strictEqual(yield* store.countLive(workspaceId), 1);
      }).pipe(Effect.ensuring(cleared(workspaceId)));
    })
  );

  it.effect("reads every origin a post keeps as a rule's", () =>
    Effect.gen(function* startedVia() {
      const store = yield* RecyclingStore;
      const workspaceId = yield* freshWorkspace;

      const kept = yield* Schema.decodeUnknownEffect(
        Schema.fromJsonString(Schema.Array(PostOriginSchema))
      )(yield* Effect.promise(async () => await readFile(origins, "utf-8")));

      yield* Effect.gen(function* checks() {
        const rules = yield* Effect.forEach(
          kept,
          (origin) =>
            newId(PostIdSchema).pipe(
              Effect.flatMap((source) => ruleOf(workspaceId, source, origin))
            ),
          { concurrency: 1 }
        );

        yield* Effect.forEach(rules, (rule) => store.insert(rule), {
          discard: true,
        });

        const read = yield* Effect.forEach(
          rules,
          (rule) => store.byId(workspaceId, rule.id),
          { concurrency: 1 }
        );

        assert.deepStrictEqual(
          read.map((rule) =>
            rule.pipe(Option.map(({ startedVia: via }) => via))
          ),
          kept.map((origin) => Option.some(origin))
        );
      }).pipe(Effect.ensuring(cleared(workspaceId)));
    })
  );

  it.effect("lists the rules due, by their latest occurrence's time", () =>
    Effect.gen(function* due() {
      const store = yield* RecyclingStore;
      const workspaceId = yield* freshWorkspace;
      const rule = yield* ruleOf(workspaceId, yield* newId(PostIdSchema), web);

      yield* Effect.gen(function* checks() {
        yield* store.insert(rule);

        const before = yield* store.due(
          DateTime.makeUnsafe("2026-06-15T06:59:00Z"),
          Option.none(),
          1000
        );

        const after = yield* store.due(now, Option.none(), 1000);

        assert.isFalse(before.some(({ id }) => id === rule.id));
        assert.isTrue(after.some(({ id }) => id === rule.id));
        assert.isAtLeast(
          yield* store.overdue(DateTime.makeUnsafe("2026-07-01T00:00:00Z")),
          1
        );
      }).pipe(Effect.ensuring(cleared(workspaceId)));
    })
  );
});
