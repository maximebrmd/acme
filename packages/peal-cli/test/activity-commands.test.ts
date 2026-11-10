import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { ActivityPageSchema } from "peal-contract";

import { filesLayer, signedIn } from "./signed-in.ts";
import { activityLog, auditedKeyId, userId } from "./studio.ts";

// peal activity, against the in-memory studio: what it asks the server,
// what it prints, and how it explains a refusal.

const inStudio = ["--workspace", "studio"];

const list = (...rest: readonly string[]) => [
  "activity",
  "list",
  ...rest,
  ...inStudio,
];

const encodePage = Schema.encodeSync(Schema.toCodecJson(ActivityPageSchema));

// The second event: a key refused.
const [, refusal] = activityLog;

describe("peal activity", () => {
  it.effect(
    "lists who changed what, through which application, newest first",
    () =>
      Effect.gen(function* lists() {
        const session = yield* signedIn();
        const listed = yield* session.printed(list());
        const lines = listed.trimEnd().split("\n");

        assert.strictEqual(lines[0], "Activity in Studio, newest first:");
        assert.match(
          lines[1] ?? "",
          new RegExp(
            `^  2026-11-09T11:30:00Z\\s+posts\\.create\\s+201\\s+user ${userId}\\s+application Peal CLI\\s+request 0190f3a0-0000-7000-8000-0000000b0003$`,
            "u"
          )
        );
        assert.match(
          lines[2] ?? "",
          new RegExp(
            `^  2026-11-09T10:15:00Z\\s+posts\\.schedule\\s+403 forbidden\\s+key ${auditedKeyId}\\s+API key ci\\s+postId=0190f3a0-0000-7000-8000-00000000d002\\s+request synthetic-request-0002$`,
            "u"
          )
        );
        assert.match(
          lines[3] ?? "",
          new RegExp(
            `^  2026-11-08T09:00:00Z\\s+channels\\.disconnect\\s+204\\s+user ${userId}\\s+web app\\s+channelId=0190f3a0-0000-7000-8000-00000000c002$`,
            "u"
          )
        );
        assert.lengthOf(lines, 4);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("pages with --limit and --cursor", () =>
    Effect.gen(function* pages() {
      const session = yield* signedIn();
      const first = yield* session.printed(list("--limit", "2"));

      assert.include(first, "posts.create");
      assert.include(first, "posts.schedule");
      assert.notInclude(first, "channels.disconnect");
      assert.include(
        first,
        `More: peal activity list --workspace studio --cursor ${refusal?.id ?? ""}`
      );

      const second = yield* session.printed(
        list("--limit", "2", "--cursor", refusal?.id ?? "")
      );

      assert.include(second, "channels.disconnect");
      assert.notInclude(second, "posts.create");
      assert.notInclude(second, "More:");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("keeps one operation, or what one member or key asked for", () =>
    Effect.gen(function* filters() {
      const session = yield* signedIn();

      const byKey = yield* session.printed(list("--actor", auditedKeyId));

      assert.include(byKey, "posts.schedule");
      assert.notInclude(byKey, "posts.create");
      assert.notInclude(byKey, "channels.disconnect");

      const disconnections = yield* session.printed(
        list("--operation", "channels.disconnect", "--actor", userId)
      );

      assert.include(disconnections, "channels.disconnect");
      assert.notInclude(disconnections, "posts.create");

      assert.include(
        yield* session.printed(list("--operation", "posts.cancel")),
        "Nothing in the activity log of Studio matches: it keeps the requests that asked to change something, for 90 days."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("prints the page as the contract encodes it with --json", () =>
    Effect.gen(function* json() {
      const session = yield* signedIn();

      assert.deepStrictEqual(
        JSON.parse(yield* session.printed(list("--json"))),
        encodePage({ items: activityLog, nextCursor: null })
      );
      assert.deepStrictEqual(
        JSON.parse(
          yield* session.printed(
            list("--json", "--limit", "1", "--operation", "posts.schedule")
          )
        ),
        encodePage({
          items: refusal === undefined ? [] : [refusal],
          nextCursor: null,
        })
      );
      // Instants are ISO 8601, in UTC.
      assert.include(
        yield* session.printed(list("--json")),
        '"occurredAt": "2026-11-09T11:30:00.000Z"'
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("tells a member who may not read it, in the server's words", () =>
    Effect.gen(function* viewer() {
      const session = yield* signedIn();

      for (const args of [
        ["activity", "list"],
        ["activity", "list", "--json"],
      ]) {
        assert.include(
          yield* session.refused([...args, "--workspace", "shop"]),
          "Peal refused: Your role in this workspace does not have the permission activity:read. An owner or an admin of the workspace changes roles, in its settings."
        );
      }
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
