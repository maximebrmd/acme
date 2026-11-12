import { readFile } from "node:fs/promises";
import path from "node:path";

import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Option, Schema } from "effect";
import { MessageStorage } from "effect/cluster";
import { TestClock } from "effect/testing";
import { Activity, WorkflowEngine } from "effect/workflow";

import {
  ChangeOutcomeSchema,
  RemovalClaimSchema,
} from "#publishing/application/live-post-removal.ts";
import { PublicationJournal } from "#publishing/application/publication-journal.ts";
import { PostOutcomeSchema } from "#publishing/domain/post-status.ts";
import {
  PartRecordSchema,
  PartsClaimSchema,
  PostClaimSchema,
  PostRunOutcomeSchema,
  TargetClaimSchema,
  TargetOutcomeSchema,
} from "#publishing/domain/publication-claims.ts";
import { PublicationDecisionSchema } from "#publishing/domain/publication-policy.ts";
import { RemovalDecisionSchema } from "#publishing/domain/removal-decision.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { ChangeLivePostV1 } from "#publishing/infrastructure/workflows/change-live-post.ts";
import { PublishTargetV2 } from "#publishing/infrastructure/workflows/publish-parts.ts";
import {
  persistedWorkflowTags,
  postJobVersion,
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
// The fixtures are what PublishPostV1, PublishTargetV1 and PublishTargetV2
// store; keep them when the schemas change, and add new ones beside them.

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

const workflows = [
  PublishPostV1,
  PublishTargetV1,
  PublishTargetV2,
  ChangeLivePostV1,
];

// The result schema of each activity a job started now runs, by name
// (`publish/<part>/<n>` for attempts, `record-part/<part>` for parts).
const activityResults = {
  "claim-post": PostClaimSchema,
  "claim-target": PartsClaimSchema,
  "complete-post": PostOutcomeSchema,
  publish: PublicationDecisionSchema,
  "record-outcome": TargetOutcomeSchema,
  "record-part": PartRecordSchema,
};

const ActivityNameSchema = Schema.Literals([
  "claim-post",
  "claim-target",
  "complete-post",
  "publish",
  "record-outcome",
  "record-part",
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

const PartKeysSchema = Schema.Struct({
  executionId: Schema.String,
  "publish/0/1": Schema.String,
  "publish/1/1": Schema.String,
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
  // A change of a live post: its payload holds the change's id alone, and
  // its execution id comes from it, so a request answered again never
  // starts a second job for the same change.
  it.effect("decodes ChangeLivePostV1's payload, results and ids", () =>
    Effect.gen(function* decodesChanges() {
      const payload = yield* fixture(
        "ChangeLivePostV1",
        "payload.json",
        ChangeLivePostV1.payloadSchema
      );

      const keys = yield* fixture(
        "ChangeLivePostV1",
        "keys.json",
        PostKeysSchema
      );

      assert.strictEqual(
        yield* ChangeLivePostV1.executionId(payload),
        keys.executionId
      );

      const claims = yield* fixture(
        "ChangeLivePostV1",
        "claim.json",
        Schema.Array(RemovalClaimSchema)
      );

      const calls = yield* fixture(
        "ChangeLivePostV1",
        "call.json",
        Schema.Array(RemovalDecisionSchema)
      );

      const settled = yield* fixture(
        "ChangeLivePostV1",
        "settle.json",
        Schema.Array(ChangeOutcomeSchema)
      );

      const result = yield* fixture(
        "ChangeLivePostV1",
        "result.json",
        ChangeLivePostV1.successSchema
      );

      assert.deepStrictEqual(
        claims.map(({ _tag }) => _tag),
        ["parts", "gone"]
      );
      assert.deepStrictEqual(
        calls.map(({ _tag }) => _tag),
        ["removed", "removed", "retry", "retry", "failed", "failed", "gone"]
      );
      assert.deepStrictEqual(settled, ["done", "failed", "gone"]);
      assert.strictEqual(result, "done");

      // An edit's calls, under the same activity names.
      const edits = yield* fixture(
        "ChangeLivePostV1",
        "edit-call.json",
        Schema.Array(RemovalDecisionSchema)
      );

      assert.deepStrictEqual(
        edits.map(({ _tag }) => _tag),
        ["edited", "retry", "failed", "gone"]
      );
    })
  );

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

  it.effect("derives the same ids and part keys from a V2 payload", () =>
    Effect.gen(function* derivesPartKeys() {
      const target = yield* fixture(
        "PublishTargetV2",
        "payload.json",
        PublishTargetV2.payloadSchema
      );

      const keys = yield* fixture(
        "PublishTargetV2",
        "keys.json",
        PartKeysSchema
      );

      const executionId = yield* PublishTargetV2.executionId(target);

      // As the `publish/<part>/<n>` activities compute them.
      const keyOf = (name: string) =>
        Activity.idempotencyKey(name).pipe(
          Effect.provideService(
            WorkflowEngine.WorkflowInstance,
            WorkflowEngine.WorkflowInstance.initial(
              PublishTargetV2,
              executionId
            )
          )
        );

      assert.deepStrictEqual(
        {
          executionId,
          "publish/0/1": yield* keyOf("publish/0/1"),
          "publish/1/1": yield* keyOf("publish/1/1"),
        },
        { ...keys }
      );
    })
  );

  it.effect("runs the target job a post's job was started for", () =>
    Effect.gen(function* keepsVersions() {
      const first = yield* fixture(
        "PublishPostV1",
        "payload.json",
        PublishPostV1.payloadSchema
      );

      const second = yield* fixture(
        "PublishPostV1",
        "payload-code-version-2.json",
        PublishPostV1.payloadSchema
      );

      // Jobs stored at version 1 keep their PublishTargetV1 children.
      assert.isBelow(first.codeVersion, postJobVersion);
      assert.strictEqual(second.codeVersion, postJobVersion);
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
    {
      file: "claim-target.json",
      schema: PartsClaimSchema,
      workflow: "PublishTargetV2",
    },
    {
      file: "publish.json",
      schema: PublicationDecisionSchema,
      workflow: "PublishTargetV2",
    },
    {
      file: "record-part.json",
      schema: PartRecordSchema,
      workflow: "PublishTargetV2",
    },
    {
      file: "record-outcome.json",
      schema: TargetOutcomeSchema,
      workflow: "PublishTargetV2",
    },
    {
      file: "result.json",
      schema: TargetOutcomeSchema,
      workflow: "PublishTargetV2",
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
            "PublishTargetV2 payload",
            "claim-target",
            "publish/0/1",
            "PublishTargetV2 clock retry/0/1",
            "publish/0/2",
            "record-part/0",
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

          const call = {
            attempt: 1,
            part: 0,
            round: 1,
            startedAt,
            targetId: target.id,
          };

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
