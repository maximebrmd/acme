import { readFile } from "node:fs/promises";
import path from "node:path";

import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { MessageStorage } from "effect/cluster";

import { PostOutcomeSchema } from "#publishing/domain/post-status.ts";
import {
  PostClaimSchema,
  PostRunOutcomeSchema,
  TargetClaimSchema,
  TargetOutcomeSchema,
} from "#publishing/domain/publication-claims.ts";
import { PublicationDecisionSchema } from "#publishing/domain/publication-policy.ts";
import {
  persistedWorkflowTags,
  PublishPostV1,
} from "#publishing/infrastructure/workflows/publish-post.ts";
import { PublishTargetV1 } from "#publishing/infrastructure/workflows/publish-target.ts";

import {
  eventually,
  isFinished,
  isSuspended,
  newChannel,
  onServerAt,
  scheduleIn,
  schedulePost,
  setTime,
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
    "decodes what a real run stores with the same schemas",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* decodesARealRun() {
          const post = yield* schedulePost(
            [yield* newChannel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          const driver = yield* MessageStorage.MemoryDriver;
          const decoded: string[] = [];

          for (const { envelope, replies } of driver.requests.values()) {
            if (envelope._tag !== "Request") {
              continue;
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
            "claim-post",
            "PublishTargetV1 payload",
            "claim-target",
            "publish/1",
            "record-outcome",
            "complete-post",
          ]);
        })
      ),
    60_000
  );
});
