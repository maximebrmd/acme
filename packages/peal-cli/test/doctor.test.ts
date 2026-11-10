import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Ref, Schema } from "effect";

import { runWith } from "#cli.ts";
import { DiagnosisSchema } from "#commands/doctor.ts";
import { DoctorFailed } from "#doctor-failed.ts";

import { draftingKey, filesLayer, signedIn } from "./signed-in.ts";
import type { Runs } from "./signed-in.ts";
import { studioId } from "./studio.ts";
import { cliEnvironment, fetching, output } from "./support.ts";

// peal doctor, against the in-memory server: what it reports for each way
// a run can be set up, and that it changes nothing.

const diagnosisOf = Schema.decodeUnknownSync(
  Schema.fromJsonString(DiagnosisSchema)
);

const inStudio = ["--workspace", "studio"];

const statuses = (text: string) =>
  Object.fromEntries(
    diagnosisOf(text).checks.map(({ name, status }) => [name, status])
  );

const check = (text: string, wanted: string) => {
  const found = diagnosisOf(text).checks.find(({ name }) => name === wanted);

  return { detail: found?.detail ?? "", fix: found?.fix ?? "" };
};

// What a failing diagnosis printed on stdout, and that it exits with 1.
const failingReport = (runs: Runs, args: readonly string[]) =>
  Effect.gen(function* reporting() {
    const before = (yield* output).logs.length;

    yield* runs.refused(args);

    return (yield* output).logs.slice(before).join("\n");
  });

describe("peal doctor", () => {
  it.effect("says everything is in order for a full sign-in", () =>
    Effect.gen(function* allGood() {
      const session = yield* signedIn();

      const text = yield* session.printed(["doctor", "--json", ...inStudio]);
      const diagnosis = diagnosisOf(text);

      assert.isTrue(diagnosis.ok);
      assert.deepStrictEqual(statuses(text), {
        access: "ok",
        "api-url": "ok",
        changelog: "ok",
        credential: "ok",
        health: "ok",
        mcp: "ok",
        "publish-scope": "ok",
        ready: "ok",
        workspace: "ok",
      });
      assert.include(check(text, "api-url").detail, "the default");
      assert.include(
        check(text, "changelog").detail,
        "The API's latest release is of 20"
      );
      assert.include(
        check(text, "access").detail,
        "Signed in as Synthetic User <synthetic@example.test>, in 2 workspaces"
      );
      assert.include(
        check(text, "publish-scope").detail,
        "can schedule and publish"
      );
      assert.include(
        check(text, "workspace").detail,
        `Commands act in Studio (studio, ${studioId}, owner), from --workspace.`
      );
      assert.include(
        check(text, "mcp").detail,
        "http://localhost:3001/api/mcp"
      );

      // It reads, and changes nothing.
      const { changes } = yield* Ref.get(session.studio.state);

      assert.deepStrictEqual(changes, []);

      const prose = yield* session.printed(["doctor", ...inStudio]);

      assert.match(prose, /^ok\s+api-url\s+http:\/\/localhost:3000/mu);
      assert.match(prose, /^ok\s+credential\s+The sign-in saved for/mu);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says where the URL and the workspace came from", () =>
    Effect.gen(function* sources() {
      const session = yield* signedIn();

      const fromEnv = yield* session
        .withEnv({
          PEAL_API_URL: "http://localhost:3000",
          PEAL_WORKSPACE: "studio",
        })
        .printed(["doctor", "--json"]);

      assert.include(check(fromEnv, "api-url").detail, "from PEAL_API_URL");
      assert.include(check(fromEnv, "workspace").detail, "from PEAL_WORKSPACE");
      assert.include(
        check(
          yield* session.printed([
            "doctor",
            "--json",
            "--api-url",
            "http://localhost:3000/",
            ...inStudio,
          ]),
          "api-url"
        ).detail,
        "the default"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists the workspaces when none is named among several", () =>
    Effect.gen(function* ambiguous() {
      const session = yield* signedIn();
      const text = yield* failingReport(session, ["doctor", "--json"]);

      assert.isFalse(diagnosisOf(text).ok);
      assert.strictEqual(statuses(text)["workspace"], "failing");
      assert.include(check(text, "workspace").detail, "Studio (studio, ");
      assert.include(check(text, "workspace").detail, "Shop (shop, ");
      assert.include(
        check(text, "workspace").fix,
        "--workspace or PEAL_WORKSPACE"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("fails, and skips the rest, when the server is unreachable", () =>
    Effect.gen(function* unreachable() {
      const refusing = fetching(() => {
        throw new TypeError("ECONNREFUSED: Unable to connect to the server");
      });

      const error = yield* runWith(["doctor", "--json"]).pipe(
        Effect.flip,
        Effect.provide(Layer.mergeAll(cliEnvironment(), refusing))
      );

      assert.instanceOf(error, DoctorFailed);

      const { errors, logs } = yield* output;
      const text = logs.join("\n");

      assert.isFalse(diagnosisOf(text).ok);
      assert.strictEqual(statuses(text)["health"], "failing");
      assert.strictEqual(statuses(text)["ready"], "skipped");
      assert.strictEqual(statuses(text)["changelog"], "skipped");
      assert.include(check(text, "health").fix, "--api-url or PEAL_API_URL");
      assert.include(check(text, "mcp").detail, "a guess");
      // The exit is explained on stderr, as JSON too.
      assert.include(errors.join("\n"), '"code": "checks_failed"');
    })
  );

  it.effect("tells someone signed out how to get a credential", () =>
    Effect.gen(function* signedOut() {
      const session = yield* signedIn({ signIn: false });
      const text = yield* failingReport(session, ["doctor", "--json"]);

      assert.strictEqual(statuses(text)["health"], "ok");
      assert.strictEqual(statuses(text)["credential"], "failing");
      assert.strictEqual(statuses(text)["access"], "skipped");
      assert.include(
        check(text, "credential").fix,
        "Run peal login, or set PEAL_API_KEY"
      );
      assert.include(
        yield* session.refused(["doctor"]),
        "1 check fails: credential."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says what a sign-in without the publish scope may do", () =>
    Effect.gen(function* withoutPublishing() {
      const session = yield* signedIn({
        scope: "offline_access workspace:read workspace:write",
      });

      const text = yield* session.printed(["doctor", "--json", ...inStudio]);

      assert.isTrue(diagnosisOf(text).ok);
      assert.include(
        check(text, "publish-scope").detail,
        "it can write drafts; it cannot schedule or publish"
      );
      assert.include(
        check(text, "publish-scope").fix,
        "run peal login again and approve it"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("tries an API key, and names the permission it lacks", () =>
    Effect.gen(function* keys() {
      const blind = {
        ...draftingKey,
        key: "peal_test_synthetic_blind_key",
        permissions: ["post:create"],
      } as const;

      const session = yield* signedIn({
        keys: [draftingKey, blind],
        signIn: false,
      });

      const byId = ["doctor", "--json", "--workspace", studioId];

      const good = yield* session
        .withEnv({ PEAL_API_KEY: draftingKey.key })
        .printed(byId);

      assert.isTrue(diagnosisOf(good).ok);
      assert.include(check(good, "credential").detail, "PEAL_API_KEY");
      assert.include(
        check(good, "access").detail,
        "The key reads the workspace"
      );
      assert.strictEqual(statuses(good)["publish-scope"], "skipped");

      const lacking = yield* failingReport(
        session.withEnv({ PEAL_API_KEY: blind.key }),
        byId
      );

      assert.strictEqual(statuses(lacking)["access"], "failing");
      assert.include(
        check(lacking, "access").detail,
        "lacks the permission channel:read"
      );
      assert.include(check(lacking, "access").fix, "channel:read");

      const bySlug = yield* failingReport(
        session.withEnv({ PEAL_API_KEY: draftingKey.key }),
        ["doctor", "--json", ...inStudio]
      );

      assert.strictEqual(statuses(bySlug)["workspace"], "failing");
      assert.include(check(bySlug, "workspace").fix, "/app/<id>/settings");

      const printed = yield* output;

      assert.notInclude(
        [...printed.errors, ...printed.logs].join("\n"),
        "peal_test_"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
