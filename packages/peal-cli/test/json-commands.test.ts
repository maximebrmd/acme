import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import {
  AnalyticsDashboardSchema,
  ChannelSeriesSchema,
  InboxAbilitiesSchema,
  InboxThreadDetailSchema,
} from "peal-contract";

import { runWith } from "#cli.ts";

import { filesLayer, signedIn } from "./signed-in.ts";
import {
  inboxChannelId,
  inboxThreadId,
  unconfirmedReplyId,
  waitingCommentId,
} from "./studio-inbox.ts";
import {
  failedTargetId,
  finishedId,
  hookId,
  mastodonId,
  readyMediaId,
  scheduledId,
  shopId,
  studioId,
} from "./studio.ts";
import { cliEnvironment, fetching, output } from "./support.ts";

// --json, on every command an agent reads: the API's answer on stdout,
// and a failure as one JSON document on stderr.

const inStudio = ["--workspace", "studio"];

const parsed = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown));

const ErrorSchema = Schema.fromJsonString(
  Schema.Struct({
    error: Schema.Record(Schema.String, Schema.Unknown),
  })
);

const errorOf = (text: string) =>
  Schema.decodeUnknownSync(ErrorSchema)(text).error;

// Runs the command line against a transport, signed out, and answers with
// the JSON it printed on stderr, checking stdout stayed empty.
const failureWith = (
  args: readonly string[],
  respond: (request: Request) => Response,
  env: Record<string, string> = {}
) =>
  Effect.gen(function* failure() {
    yield* runWith(args).pipe(
      Effect.flip,
      Effect.provide(Layer.mergeAll(cliEnvironment(env), fetching(respond)))
    );

    const { errors, logs } = yield* output;

    assert.deepStrictEqual(logs, []);

    return errorOf(errors.join("\n"));
  });

// A server that fails, and names the request it failed.
const failing = () =>
  new Response("synthetic failure", {
    headers: { "x-request-id": "synthetic-request-0500" },
    status: 500,
  });

describe("--json on what an agent reads", () => {
  it.effect("prints who is signed in, with each workspace's id", () =>
    Effect.gen(function* whoami() {
      const session = yield* signedIn();

      assert.deepInclude(parsed(yield* session.printed(["whoami", "--json"])), {
        impersonatedBy: null,
      });
      assert.include(yield* session.printed(["whoami", "--json"]), studioId);

      // People read the ids too, to give an API key its workspace.
      const prose = yield* session.printed(["whoami"]);

      assert.match(
        prose,
        new RegExp(`Studio \\(owner\\)\\s+studio\\s+${studioId}`, "u")
      );
      assert.match(
        prose,
        new RegExp(`Shop \\(viewer\\)\\s+shop\\s+${shopId}`, "u")
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("prints each answer as the contract encodes it", () =>
    Effect.gen(function* answers() {
      const session = yield* signedIn();

      const json = (...args: readonly string[]) =>
        session
          .printed([...args, "--json", ...inStudio])
          .pipe(Effect.map(parsed));

      assert.hasAllKeys(yield* json("billing"), ["billing", "standing"]);
      assert.deepInclude(
        yield* json("usage", "--from", "2026-11-01", "--to", "2026-11-03"),
        { period: { from: "2026-11-01", to: "2026-11-03" } }
      );
      assert.isArray(yield* json("members", "list"));
      assert.isArray(yield* json("invitations", "list"));
      assert.isArray(yield* json("webhooks", "list"));
      assert.deepInclude(yield* json("webhooks", "show", hookId), {
        id: hookId,
      });
      assert.hasAllKeys(yield* json("webhooks", "deliveries", hookId), [
        "items",
        "nextCursor",
      ]);
      assert.hasAnyKeys(yield* json("analytics", "summary"), ["from", "to"]);
      assert.hasAnyKeys(yield* json("analytics", "post", finishedId), [
        "targets",
      ]);
      assert.isArray(
        parsed(yield* session.printed(["account", "apps", "--json"]))
      );
      assert.deepInclude(parsed(yield* session.printed(["health", "--json"])), {
        healthy: true,
        url: "http://localhost:3000",
      });
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "prints the dashboard, a channel's days and the inbox as the contract encodes them",
    () =>
      Effect.gen(function* depth() {
        const session = yield* signedIn();

        const json = (...args: readonly string[]) =>
          session
            .printed([...args, "--json", ...inStudio])
            .pipe(Effect.map(parsed));

        assert.hasAllKeys(
          yield* json("analytics", "dashboard", "--days", "7"),
          Object.keys(AnalyticsDashboardSchema.fields)
        );
        assert.hasAllKeys(
          yield* json("analytics", "channel", mastodonId),
          Object.keys(ChannelSeriesSchema.fields)
        );

        assert.hasAllKeys(yield* json("inbox", "threads"), [
          "items",
          "nextCursor",
        ]);

        // A thread whole: comments are data, printed as the server holds
        // them, for the agent to treat as such.
        const thread = yield* json("inbox", "thread", inboxThreadId);

        assert.hasAllKeys(thread, Object.keys(InboxThreadDetailSchema.fields));
        assert.hasAllKeys(
          yield* json("inbox", "abilities", inboxChannelId),
          Object.keys(InboxAbilitiesSchema.fields)
        );

        // What changes something answers what the API answered.
        assert.deepInclude(yield* json("inbox", "answered", waitingCommentId), {
          id: waitingCommentId,
          state: "answered",
        });
        assert.deepInclude(
          yield* json("inbox", "confirm", unconfirmedReplyId, "--not-sent"),
          { id: unconfirmedReplyId, status: "failed" }
        );
        assert.deepInclude(
          yield* json(
            "inbox",
            "reply",
            waitingCommentId,
            "--text",
            "Thank you, synthetic reader."
          ),
          { commentId: waitingCommentId, status: "sending" }
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("prints null for an answer without a body", () =>
    Effect.gen(function* nothing() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed([
          "webhooks",
          "delete",
          hookId,
          "--json",
          ...inStudio,
        ]),
        "null"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists scheduled posts, a post's attempts and one media", () =>
    Effect.gen(function* reads() {
      const session = yield* signedIn();

      const listed = yield* session.printed(["posts", "list", ...inStudio]);

      assert.include(listed, "Posts of Studio:");
      assert.include(listed, scheduledId);
      assert.include(listed, finishedId);

      const ahead = yield* session.printed([
        "posts",
        "list",
        "--from",
        "2026-11-09T12:00:05Z",
        ...inStudio,
      ]);

      assert.include(ahead, scheduledId);
      assert.notInclude(ahead, finishedId);
      assert.include(
        yield* session.printed([
          "posts",
          "list",
          "--from",
          "2026-11-01T00:00:00Z",
          "--to",
          "2026-11-09T00:00:00Z",
          "--json",
          ...inStudio,
        ]),
        finishedId
      );
      assert.include(
        yield* session.refused([
          "posts",
          "list",
          "--from",
          "2026-11-09T00:00:00Z",
          "--to",
          "2026-11-01T00:00:00Z",
          ...inStudio,
        ]),
        "The range ends before it starts: give a --to later than --from."
      );

      const attempts = yield* session.printed([
        "posts",
        "attempts",
        finishedId,
        ...inStudio,
      ]);

      assert.match(
        attempts,
        new RegExp(
          `${failedTargetId}\\s+round 1\\s+attempt 1\\s+2026-11-08T09:00:00Z\\s+rateLimited \\(429\\)\\s+retried 2026-11-08T09:05:00Z`,
          "u"
        )
      );
      assert.include(
        yield* session.printed([
          "posts",
          "attempts",
          finishedId,
          "--json",
          ...inStudio,
        ]),
        '"refusalCode": "429"'
      );
      assert.include(
        yield* session.printed(["media", "show", readyMediaId, ...inStudio]),
        `Media ${readyMediaId} of Studio (image/`
      );
      assert.deepInclude(
        parsed(
          yield* session.printed([
            "media",
            "show",
            readyMediaId,
            "--json",
            ...inStudio,
          ])
        ),
        { id: readyMediaId }
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("a failure with --json", () => {
  it.effect("is the command line's own refusal, under its code", () =>
    Effect.gen(function* own() {
      const session = yield* signedIn();

      const before = (yield* output).logs.length;

      const error = errorOf(
        yield* session.refused(["drafts", "list", "--json"])
      );

      assert.strictEqual(error["code"], "workspace_required");
      assert.include(error["message"], "You belong to several workspaces");
      assert.notProperty(error, "requestId");
      assert.strictEqual((yield* output).logs.length, before);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says nobody is signed in", () =>
    Effect.gen(function* signedOut() {
      const session = yield* signedIn({ signIn: false });

      assert.deepStrictEqual(
        errorOf(yield* session.refused(["drafts", "list", "--json"])),
        {
          code: "not_signed_in",
          message:
            "You are not signed in to http://localhost:3000. Run peal login first.",
        }
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says the server is unreachable, without a request id", () =>
    Effect.gen(function* unreachable() {
      const error = yield* failureWith(["health", "--json"], () => {
        throw new TypeError("ECONNREFUSED: Unable to connect to the server");
      });

      assert.deepStrictEqual(error, {
        code: "unreachable",
        message:
          "Cannot reach the Peal API at http://localhost:3000 (ECONNREFUSED: Unable to connect to the server).",
      });
    })
  );

  it.effect("names a server that answers an error, with the request's id", () =>
    Effect.gen(function* broken() {
      assert.strictEqual(
        (yield* failureWith(["health", "--json"], failing))["code"],
        "unhealthy"
      );
    })
  );

  it.effect("names an error status by the API's general code", () =>
    Effect.gen(function* status() {
      const error = yield* failureWith(
        ["channels", "list", "--json", "--workspace", studioId],
        failing,
        { PEAL_API_KEY: "peal_test_synthetic_key" }
      );

      assert.deepStrictEqual(error, {
        code: "internal_error",
        message:
          "The Peal API at http://localhost:3000 did not answer as expected (HTTP 500).",
        requestId: "synthetic-request-0500",
      });
    })
  );

  it.effect("says the arguments could not be read, and prints no help", () =>
    Effect.gen(function* usage() {
      const error = yield* failureWith(
        ["drafts", "list", "--json", "--no-such-flag"],
        () => new Response(null, { status: 204 })
      );

      assert.strictEqual(error["code"], "invalid_usage");
      assert.include(error["message"], "--no-such-flag");
    })
  );
});
