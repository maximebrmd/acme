import { assert, describe, it } from "@effect/vitest";
import { Cause, Effect, Exit, Option, Ref, Schema } from "effect";
import { HttpServerResponse } from "effect/http";
import { HttpApiError } from "effect/http-api";
import { Forbidden, PostNotFound } from "peal-contract";
import { errorsByTag } from "peal-contract/errors";

import {
  ChangeMark,
  changesNothing,
  makeChangeMark,
} from "#shared/api/change-mark.ts";
import { RequestId } from "#shared/api/request-id.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import {
  outcomeOf,
  recorded,
  recordToolCall,
  viaOf,
} from "#workspace/api/activity-recording.ts";
import { ActivityJournal } from "#workspace/application/activity-journal.ts";
import type { AnsweredChange } from "#workspace/application/activity-journal.ts";
import { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import {
  PartnerIdSchema,
  PartnerKeyIdSchema,
} from "#workspace/domain/partner-id.ts";
import { PartnerKeyPrincipal } from "#workspace/domain/partner-key-principal.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";
import { answerOf } from "#workspace/infrastructure/logged-activity-journal.ts";

const workspaceId = WorkspaceIdSchema.make(
  "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"
);

const userId = UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

const inPerson = new UserPrincipal({ impersonatedBy: Option.none(), userId });

const throughClient = new UserPrincipal({
  impersonatedBy: Option.none(),
  oauth: Option.some({
    clientId: "peal-cli",
    scopes: ["workspace:write"],
    workspaceId: Option.none(),
  }),
  userId,
});

const key = new ApiKeyPrincipal({
  apiKeyId: "synthetic-key",
  permissions: ["post:create"],
  workspaceId,
});

const partnerKey = new PartnerKeyPrincipal({
  partnerId: PartnerIdSchema.make("0195d2c0-0000-7000-8000-0000000000a1"),
  partnerKeyId: PartnerKeyIdSchema.make("0195d2c0-0000-7000-8000-0000000000a2"),
  permissions: ["post:create"],
  scopes: ["workspaces:read"],
});

const catalogue = errorsByTag();

// What an exit is recorded as: the status and the error's code.
const answered = <E>(
  exit: Exit.Exit<HttpServerResponse.HttpServerResponse, E>
) => {
  const { errorCode, status } = answerOf(outcomeOf(exit), catalogue);

  return [Option.getOrNull(status), Option.getOrNull(errorCode)];
};

const schemaError = (kind: "Body" | "Payload") =>
  Schema.decodeUnknownEffect(Schema.Struct({ text: Schema.String }))({}).pipe(
    Effect.flip,
    Effect.map((cause) => new HttpApiError.HttpApiSchemaError({ cause, kind }))
  );

describe("how a request's answer is kept", () => {
  it("keeps a response's status", () => {
    assert.deepStrictEqual(
      answered(Exit.succeed(HttpServerResponse.empty({ status: 204 }))),
      [204, null]
    );
  });

  it("keeps the status and the code of the contract's error a handler failed with", () => {
    assert.deepStrictEqual(answered(Exit.fail(new PostNotFound())), [
      404,
      "post_not_found",
    ]);
    assert.deepStrictEqual(answered(Exit.fail(new Forbidden())), [
      403,
      "forbidden",
    ]);
    assert.deepStrictEqual(answered(Exit.fail(new HttpApiError.BadRequest())), [
      400,
      "bad_request",
    ]);
  });

  it.effect(
    "keeps a request the API could not read as invalid, and an answer it could not write as its own failure",
    () =>
      Effect.gen(function* unreadable() {
        assert.deepStrictEqual(
          answered(Exit.fail(yield* schemaError("Payload"))),
          [400, "invalid_request"]
        );
        assert.deepStrictEqual(
          answered(Exit.fail(yield* schemaError("Body"))),
          [500, null]
        );
      })
  );

  it("keeps a failure the contract does not know, and a bug, as a 500 without a code", () => {
    assert.deepStrictEqual(
      answered(Exit.fail(new DatabaseError({ cause: "synthetic" }))),
      [500, null]
    );
    assert.deepStrictEqual(answered(Exit.fail("synthetic")), [500, null]);
    assert.deepStrictEqual(answered(Exit.die(new Error("synthetic"))), [
      500,
      null,
    ]);
  });

  it("keeps no status for a request interrupted before its answer", () => {
    assert.deepStrictEqual(answered(Exit.failCause(Cause.interrupt())), [
      null,
      null,
    ]);
  });

  it("says how each principal authenticated", () => {
    assert.deepStrictEqual(
      [viaOf(inPerson), viaOf(throughClient), viaOf(key), viaOf(partnerKey)],
      ["session", "oauth", "apiKey", "partnerKey"]
    );
  });
});

// A journal that keeps what it is told in memory, or fails.
const journalOf = (kept: Ref.Ref<readonly AnsweredChange[]>) =>
  ActivityJournal.of({
    record: (change) => Ref.update(kept, (all) => [...all, change]),
  });

const failingJournal = ActivityJournal.of({
  record: () => Effect.fail(new DatabaseError({ cause: "synthetic" })),
});

const change = {
  named: { postId: "0195d2c0-0000-7000-8000-000000000001", workspaceId },
  operation: "posts.discard",
  principal: key,
  workspaceId,
};

describe("recording a request", () => {
  it.effect("keeps it once answered, with its request id", () =>
    Effect.gen(function* keeps() {
      const kept = yield* Ref.make<readonly AnsweredChange[]>([]);

      const response = yield* Effect.succeed(
        HttpServerResponse.empty({ status: 204 })
      ).pipe(
        recorded(journalOf(kept), change),
        Effect.provideService(RequestId, "activity-test-0006")
      );

      assert.strictEqual(response.status, 204);
      assert.deepStrictEqual(yield* Ref.get(kept), [
        {
          ...change,
          outcome: { _tag: "answered", status: 204 },
          requestId: Option.some("activity-test-0006"),
          via: "apiKey",
        },
      ]);
    })
  );

  it.effect("keeps nothing of a request that said it changes nothing", () =>
    Effect.gen(function* dryRun() {
      const kept = yield* Ref.make<readonly AnsweredChange[]>([]);

      const response = yield* changesNothing.pipe(
        Effect.as(HttpServerResponse.empty({ status: 200 })),
        recorded(journalOf(kept), change),
        Effect.provideService(ChangeMark, yield* makeChangeMark)
      );

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(yield* Ref.get(kept), []);
    })
  );

  it.effect("keeps a refusal, and still answers with it", () =>
    Effect.gen(function* refusals() {
      const kept = yield* Ref.make<readonly AnsweredChange[]>([]);

      const refusal = yield* Effect.fail(new PostNotFound()).pipe(
        recorded(journalOf(kept), change),
        Effect.flip
      );

      assert.strictEqual(refusal._tag, "PostNotFound");
      assert.deepStrictEqual(
        (yield* Ref.get(kept)).map(({ outcome, requestId }) => [
          outcome,
          requestId,
        ]),
        [
          [
            { _tag: "failed", error: Option.some("PostNotFound") },
            Option.none(),
          ],
        ]
      );
    })
  );

  it.effect("answers the same when the log cannot be kept", () =>
    Effect.gen(function* unkept() {
      const response = yield* Effect.succeed(
        HttpServerResponse.empty({ status: 201 })
      ).pipe(recorded(failingJournal, change));

      assert.strictEqual(response.status, 201);

      const refusal = yield* Effect.fail(new PostNotFound()).pipe(
        recorded(failingJournal, change),
        Effect.flip
      );

      assert.strictEqual(refusal._tag, "PostNotFound");
    })
  );

  it.effect(
    "leaves nothing of a workspace's deletion once it is done, and keeps one that was refused",
    () =>
      Effect.gen(function* deletion() {
        const kept = yield* Ref.make<readonly AnsweredChange[]>([]);
        const deleting = { ...change, operation: "workspaces.delete" };

        yield* Effect.succeed(HttpServerResponse.empty({ status: 204 })).pipe(
          recorded(journalOf(kept), deleting)
        );

        assert.lengthOf(yield* Ref.get(kept), 0);

        yield* Effect.fail(new Forbidden()).pipe(
          recorded(journalOf(kept), deleting),
          Effect.flip
        );

        assert.lengthOf(yield* Ref.get(kept), 1);
      })
  );

  it.effect("keeps a tool's call as mcp.<tool>, without a status", () =>
    Effect.gen(function* tools() {
      const kept = yield* Ref.make<readonly AnsweredChange[]>([]);
      const member = memberOf(workspaceId, ["post:create"]);

      yield* recordToolCall(journalOf(kept), {
        member,
        tool: "create_draft",
      }).pipe(Effect.provideService(RequestId, "activity-test-0007"));

      yield* recordToolCall(journalOf(kept), {
        errorCode: "forbidden",
        member,
        tool: "delete_draft",
      });

      // Never fails, whatever the journal does.
      yield* recordToolCall(failingJournal, { member, tool: "create_draft" });

      const calls = yield* Ref.get(kept);

      assert.deepStrictEqual(
        calls.map(({ operation, outcome, requestId, via }) => ({
          answer: answerOf(outcome, catalogue),
          operation,
          requestId,
          via,
        })),
        [
          {
            answer: { errorCode: Option.none(), status: Option.none() },
            operation: "mcp.create_draft",
            requestId: Option.some("activity-test-0007"),
            via: "mcp",
          },
          {
            answer: {
              errorCode: Option.some("forbidden"),
              status: Option.none(),
            },
            operation: "mcp.delete_draft",
            requestId: Option.none(),
            via: "mcp",
          },
        ]
      );
      assert.deepStrictEqual(
        calls.map(({ principal, workspaceId: where }) => [
          principal._tag,
          where,
        ]),
        [
          ["UserPrincipal", workspaceId],
          ["UserPrincipal", workspaceId],
        ]
      );
    })
  );
});
