import { readFile } from "node:fs/promises";
import path from "node:path";

import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Option, Schema } from "effect";
import { MessageStorage } from "effect/cluster";
import { TestClock } from "effect/testing";
import { Activity, WorkflowEngine } from "effect/workflow";

import { PublicationJournal } from "#publishing/application/publication-journal.ts";
import { PostOutcomeSchema } from "#publishing/domain/post-status.ts";
import {
  PostClaimSchema,
  PostRunOutcomeSchema,
  TargetClaimSchema,
  TargetOutcomeSchema,
} from "#publishing/domain/publication-claims.ts";
import { PublicationDecisionSchema } from "#publishing/domain/publication-policy.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import {
  persistedWorkflowTags,
  PublishPostV1,
} from "#publishing/infrastructure/workflows/publish-post.ts";
import { PublishTargetV1 } from "#publishing/infrastructure/workflows/publish-target.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";

import {
  callsOn,
  eventually,
  executionOf,
  isFinished,
  isSuspended,
  isTargetWaiting,
  jobResult,
  newChannel,
  onServerAt,
  scheduleIn,
  schedulePost,
  setTime,
  targetsOf,
  utc,
} from "./harness.ts";

// Every workflow history ever stored must still decode with the current
// code: a payload or an activity result that does not ends its execution.
// The fixtures are what PublishPostV1 and PublishTargetV1 store; keep them
// when the schemas change, and add new ones beside them.

const fixtures = path.join(import.meta.dirname, "fixtures", "persisted");

// Reads a fixture as the JSON it is and decodes it with `schema`.
const fixture = <S extends Schema.Top>(
  workflow: string,
  name: string,
  schema: S
) =>
  Effect.promise(
    async () => await readFile(path.join(fixtures, workflow, name), "utf-8")
  ).pipe(
    Effect.flatMap(
      Schema.decodeUnknownEffect(
        Schema.fromJsonString(Schema.toCodecJson(schema))
      )
    )
  );

const workflows = [PublishPostV1, PublishTargetV1];

// The result schema of each activity, by name (`publish/<n>` for attempts).
const activityResults = {
  "claim-post": PostClaimSchema,
  "claim-target": TargetClaimSchema,
  "complete-post": PostOutcomeSchema,
  publish: PublicationDecisionSchema,
  "record-outcome": TargetOutcomeSchema,
};

const ActivityNameSchema = Schema.Literals([
  "claim-post",
  "claim-target",
  "complete-post",
  "publish",
  "record-outcome",
]);

const ActivityPayloadSchema = Schema.Struct({ name: Schema.String });

// What a durable clock stores: its name and the workflow it wakes.
const ClockPayloadSchema = Schema.Struct({
  name: Schema.String,
  workflowName: Schema.String,
});

const PostKeysSchema = Schema.Struct({ executionId: Schema.String });

const TargetKeysSchema = Schema.Struct({
  executionId: Schema.String,
  "publish/1": Schema.String,
});

const StoredSuccessSchema = Schema.Struct({
  exit: Schema.Struct({
    _tag: Schema.Literal("Success"),
    value: Schema.Struct({
      _tag: Schema.Literal("Complete"),
      exit: Schema.Struct({
        _tag: Schema.Literal("Success"),
        value: Schema.Unknown,
      }),
    }),
  }),
});

describe("the persisted contract", () => {
  it("keeps registering every released workflow tag", () => {
    const registered = workflows.map((workflow) => workflow._tag);

    for (const tag of persistedWorkflowTags) {
      assert.include(registered, tag);
    }
  });

  it.effect("decodes PublishPostV1 payloads, and defaults codeVersion", () =>
    Effect.gen(function* decodesPostPayloads() {
      const { payloadSchema } = PublishPostV1;

      const current = yield* fixture(
        "PublishPostV1",
        "payload.json",
        payloadSchema
      );

      const older = yield* fixture(
        "PublishPostV1",
        "payload-before-code-version.json",
        payloadSchema
      );

      assert.strictEqual(current.codeVersion, 1);
      assert.strictEqual(older.codeVersion, 1);
      assert.deepStrictEqual({ ...older }, { ...current });
    })
  );

  // The execution ids, and the attempt keys sent to the platforms and kept in
  // the journal, come from the payloads. Changed, a parent replaying after a
  // deploy starts a second child for the same target, and that child sends.
  it.effect("derives the same execution ids and keys from a payload", () =>
    Effect.gen(function* derivesTheSameKeys() {
      const post = yield* fixture(
        "PublishPostV1",
        "payload.json",
        PublishPostV1.payloadSchema
      );

      const postKeys = yield* fixture(
        "PublishPostV1",
        "keys.json",
        PostKeysSchema
      );

      assert.strictEqual(
        yield* PublishPostV1.executionId(post),
        postKeys.executionId
      );

      const target = yield* fixture(
        "PublishTargetV1",
        "payload.json",
        PublishTargetV1.payloadSchema
      );

      const targetKeys = yield* fixture(
        "PublishTargetV1",
        "keys.json",
        TargetKeysSchema
      );

      const executionId = yield* PublishTargetV1.executionId(target);

      assert.strictEqual(executionId, targetKeys.executionId);

      // As the `publish/1` activity computes it, in that execution.
      const attemptKey = yield* Activity.idempotencyKey("publish/1").pipe(
        Effect.provideService(
          WorkflowEngine.WorkflowInstance,
          WorkflowEngine.WorkflowInstance.initial(PublishTargetV1, executionId)
        )
      );

      assert.strictEqual(attemptKey, targetKeys["publish/1"]);
    })
  );

  it.effect("decodes PublishTargetV1 payloads, with their parent", () =>
    Effect.gen(function* decodesTargetPayloads() {
      const payload = yield* fixture(
        "PublishTargetV1",
        "payload.json",
        PublishTargetV1.payloadSchema
      );

      assert.strictEqual(payload.round, 1);
      assert.strictEqual(payload.codeVersion, 1);
    })
  );

  it.effect.each([
    {
      file: "claim-post.json",
      schema: PostClaimSchema,
      workflow: "PublishPostV1",
    },
    {
      file: "complete-post.json",
      schema: PostOutcomeSchema,
      workflow: "PublishPostV1",
    },
    {
      file: "result.json",
      schema: PostRunOutcomeSchema,
      workflow: "PublishPostV1",
    },
    {
      file: "claim-target.json",
      schema: TargetClaimSchema,
      workflow: "PublishTargetV1",
    },
    {
      file: "publish.json",
      schema: PublicationDecisionSchema,
      workflow: "PublishTargetV1",
    },
    {
      file: "record-outcome.json",
      schema: TargetOutcomeSchema,
      workflow: "PublishTargetV1",
    },
    {
      file: "result.json",
      schema: TargetOutcomeSchema,
      workflow: "PublishTargetV1",
    },
  ])("decodes every stored $workflow $file", ({ file, schema, workflow }) =>
    Effect.gen(function* decodesResults() {
      const decoded = yield* fixture(workflow, file, Schema.Array(schema));

      assert.isAbove(decoded.length, 0);
    })
  );

  it.effect(
    "decodes what a real run stores with the same schemas, under the same names",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* decodesARealRun() {
          const platform = yield* FakePlatform;
          const channel = yield* newChannel;

          // Refused once, so the run waits on a retry clock.
          yield* platform.script(channel, [
            {
              _tag: "fail",
              failure: new RateLimited({ retryAfter: Duration.minutes(1) }),
            },
          ]);

          const post = yield* schedulePost(
            [channel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          const [target] = yield* targetsOf(post.id);

          assert(target !== undefined);

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually(
            "the first call is refused",
            callsOn(channel).pipe(Effect.map((calls) => calls.length === 1))
          );
          yield* eventually("the job waits", isTargetWaiting(target.id));
          yield* TestClock.adjust(Duration.minutes(1));
          yield* eventually("the post finishes", isFinished(post.id));

          // Its last target finished the post: the job ends after.
          const job = yield* executionOf(post.id);

          yield* eventually(
            "the job ends",
            jobResult(job).pipe(Effect.map(Option.isSome))
          );

          const driver = yield* MessageStorage.MemoryDriver;
          const decoded: string[] = [];

          for (const { envelope, replies } of driver.requests.values()) {
            if (envelope._tag !== "Request") {
              continue;
            }

            if (envelope.address.entityType === "Workflow/-/DurableClock") {
              const clock = yield* Schema.decodeUnknownEffect(
                ClockPayloadSchema
              )(envelope.payload);

              decoded.push(`${clock.workflowName} clock ${clock.name}`);
            }

            const workflow = workflows.find(
              (candidate) =>
                envelope.address.entityType === `Workflow/${candidate._tag}`
            );

            if (workflow !== undefined && envelope.tag === "run") {
              yield* Schema.decodeUnknownEffect(
                Schema.toCodecJson(workflow.payloadSchema)
              )(envelope.payload);
              decoded.push(`${workflow._tag} payload`);
            }

            if (workflow !== undefined && envelope.tag === "activity") {
              const { name } = yield* Schema.decodeUnknownEffect(
                ActivityPayloadSchema
              )(envelope.payload);

              const activity = yield* Schema.decodeUnknownEffect(
                ActivityNameSchema
              )(name.split("/")[0]);

              const schema = activityResults[activity];
              const [reply] = replies;

              const stored =
                yield* Schema.decodeUnknownEffect(StoredSuccessSchema)(reply);

              yield* Schema.decodeUnknownEffect(Schema.toCodecJson(schema))(
                stored.exit.value.exit.value
              );
              decoded.push(name);
            }
          }

          assert.sameMembers(decoded, [
            "PublishPostV1 payload",
            "PublishPostV1 clock publish-at",
            "claim-post",
            "PublishTargetV1 payload",
            "claim-target",
            "publish/1",
            "PublishTargetV1 clock retry/1",
            "publish/2",
            "record-outcome",
            "complete-post",
          ]);
        })
      ),
    60_000
  );

  it.effect(
    "never begins one attempt twice, whatever its key",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* beginsOnce() {
          const journal = yield* PublicationJournal;

          const post = yield* schedulePost(
            [yield* newChannel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          const [target] = yield* targetsOf(post.id);

          assert(target !== undefined);

          const startedAt = utc("2026-06-15T08:00:00Z");
          const call = { attempt: 1, round: 1, startedAt, targetId: target.id };

          // As if the key had changed between two deploys.
          const keyed = (key: string) => ({
            ...call,
            idempotencyKey: `${target.id}:${key}`,
          });

          assert.deepStrictEqual(yield* journal.begin(keyed("first")), {
            _tag: "started",
          });
          assert.deepStrictEqual(yield* journal.begin(keyed("second")), {
            _tag: "inFlight",
            startedAt,
          });

          const published = {
            _tag: "published",
            platformPostId: PlatformPostIdSchema.make("1"),
          } as const;

          const finishedAt = utc("2026-06-15T08:00:01Z");

          yield* journal.finish(
            keyed("first").idempotencyKey,
            published,
            finishedAt
          );

          assert.deepStrictEqual(yield* journal.begin(keyed("third")), {
            _tag: "completed",
            finishedAt,
            outcome: published,
            startedAt,
          });
          assert.isTrue(Option.isSome(yield* journal.find(call)));
        })
      ),
    60_000
  );
});
