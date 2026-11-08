import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { CliError } from "effect/cli";

import { runWith, version } from "#cli.ts";

import { cliEnvironment, fetching, output } from "./support.ts";

// Answers like a healthy server and records where each request went.
const recordRequests = () => {
  const urls: string[] = [];

  const transport = fetching((request) => {
    urls.push(request.url);

    return new Response(null, { status: 204 });
  });

  return { transport, urls };
};

const failure = (args: readonly string[]) =>
  runWith(args).pipe(
    Effect.flip,
    Effect.provide(Layer.mergeAll(cliEnvironment(), recordRequests().transport))
  );

// Runs `acme health` and returns the URLs it requested.
const healthUrls = (args: readonly string[], env?: Record<string, string>) =>
  Effect.gen(function* requestedUrls() {
    const { transport, urls } = recordRequests();

    yield* runWith(args).pipe(
      Effect.provide(Layer.mergeAll(cliEnvironment(env), transport))
    );

    return urls;
  });

// Runs a command that must not call the API.
const offline = (args: readonly string[]) =>
  Effect.gen(function* runOffline() {
    const { transport, urls } = recordRequests();

    yield* runWith(args).pipe(
      Effect.provide(Layer.mergeAll(cliEnvironment(), transport))
    );

    assert.deepStrictEqual(urls, []);

    return yield* output;
  });

describe("acme", () => {
  it.effect("prints its version", () =>
    Effect.gen(function* printsVersion() {
      const { logs } = yield* offline(["--version"]);

      assert.match(version, /^\d+\.\d+\.\d+$/u);
      assert.deepStrictEqual(logs, [`acme v${version}`]);
    })
  );

  it.effect("lists its commands and flags in --help", () =>
    Effect.gen(function* printsHelp() {
      const help = (yield* offline(["--help"])).logs.join("\n");

      assert.include(help, "acme <subcommand> [flags]");
      assert.include(help, "--api-url <url>");
      assert.match(help, /health\s+Check that the Acme API answers/u);
    })
  );

  it.effect("rejects an unknown subcommand", () =>
    Effect.gen(function* unknownSubcommand() {
      const error = yield* failure(["deploy"]);

      assert.isTrue(CliError.isCliError(error));
      assert.strictEqual(error._tag, "ShowHelp");

      if (error._tag === "ShowHelp") {
        assert.deepStrictEqual(
          error.errors.map((cause) => cause._tag),
          ["UnknownSubcommand"]
        );
      }
    })
  );
});

describe("the API URL", () => {
  it.effect("defaults to the local server", () =>
    Effect.gen(function* defaultUrl() {
      assert.deepStrictEqual(yield* healthUrls(["health"]), [
        "http://localhost:3000/health",
      ]);
    })
  );

  it.effect("comes from ACME_API_URL when no flag is given", () =>
    Effect.gen(function* environmentUrl() {
      const urls = yield* healthUrls(["health"], {
        ACME_API_URL: "https://api.acme.test",
      });

      assert.deepStrictEqual(urls, ["https://api.acme.test/health"]);
    })
  );

  it.effect("comes from --api-url first, after or before the subcommand", () =>
    Effect.gen(function* flagUrl() {
      const env = { ACME_API_URL: "https://api.acme.test" };

      const after = yield* healthUrls(
        ["health", "--api-url", "http://127.0.0.1:4000"],
        env
      );

      const before = yield* healthUrls(
        ["--api-url", "http://127.0.0.1:4000", "health"],
        env
      );

      assert.deepStrictEqual(after, ["http://127.0.0.1:4000/health"]);
      assert.deepStrictEqual(before, ["http://127.0.0.1:4000/health"]);
    })
  );

  it.effect("keeps a base path", () =>
    Effect.gen(function* basePath() {
      const urls = yield* healthUrls([
        "health",
        "--api-url",
        "https://acme.test/api/",
      ]);

      assert.deepStrictEqual(urls, ["https://acme.test/api/health"]);
    })
  );

  it.effect("must be a URL", () =>
    Effect.gen(function* invalidUrl() {
      const { transport, urls } = recordRequests();

      const error = yield* runWith(["health", "--api-url", "not a url"]).pipe(
        Effect.flip,
        Effect.provide(Layer.mergeAll(cliEnvironment(), transport))
      );

      assert.strictEqual(error._tag, "ShowHelp");

      if (error._tag === "ShowHelp") {
        assert.deepStrictEqual(
          error.errors.map((cause) => cause._tag),
          ["InvalidValue"]
        );
      }

      assert.deepStrictEqual(urls, []);
    })
  );
});
