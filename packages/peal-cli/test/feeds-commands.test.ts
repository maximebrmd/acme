import { readFileSync } from "node:fs";
import path from "node:path";

import { assert, describe, expect, it } from "@effect/vitest";
import { Effect, Ref } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";

// peal feeds against the in-memory studio: what each command asks the
// server, what it prints, and how it explains a refusal.

const inStudio = ["--workspace", "studio"];

const feedId = "0190f3a0-0000-7000-8000-0000000fe001";
const blog = "https://blog.example/feed.xml";

describe("peal feeds", () => {
  it.effect("adds a feed, lists, shows, pauses, resumes and removes it", () =>
    Effect.gen(function* lifecycle() {
      const session = yield* signedIn();

      const added = yield* session.printed([
        "feeds",
        "add",
        blog,
        "--template",
        "{title}: {link}",
        ...inStudio,
      ]);

      assert.include(
        added,
        `Following ${blog}, 2 items it holds left as they are (to drafts, active): ${feedId}.`
      );

      assert.include(
        yield* session.printed(["feeds", "list", ...inStudio]),
        `  ${feedId}  ${blog}  to drafts, active`
      );
      assert.include(
        yield* session.printed(["feeds", "show", feedId, ...inStudio]),
        "template: {title}: {link}"
      );
      assert.include(
        yield* session.printed(["feeds", "pause", feedId, ...inStudio]),
        `Paused feed ${feedId}`
      );
      assert.include(
        yield* session.printed(["feeds", "resume", feedId, ...inStudio]),
        `Resumed feed ${feedId}`
      );
      assert.include(
        yield* session.printed(["feeds", "items", feedId, ...inStudio]),
        "skipped (existing)"
      );
      assert.strictEqual(
        yield* session.printed(["feeds", "remove", feedId, ...inStudio]),
        `Stopped following feed ${feedId}: the drafts and posts it made stay as they are.`
      );
      assert.include(
        (yield* Ref.get(session.studio.state)).changes,
        `feeds:delete:${feedId}`
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("previews what an address would post, and keeps nothing", () =>
    Effect.gen(function* previews() {
      const session = yield* signedIn();

      const shown = yield* session.printed([
        "feeds",
        "preview",
        blog,
        "--template",
        "New: {title}",
        ...inStudio,
      ]);

      assert.include(shown, "New: Second");
      assert.lengthOf((yield* Ref.get(session.studio.state)).feeds, 0);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "explains an address Peal does not read, and asks for a change",
    () =>
      Effect.gen(function* refusals() {
        const session = yield* signedIn();

        assert.include(
          yield* session.refused([
            "feeds",
            "add",
            "http://blog.example/feed.xml",
            ...inStudio,
          ]),
          "Peal reads HTTPS addresses on the default port only"
        );
        assert.include(
          yield* session.refused(["feeds", "update", feedId, ...inStudio]),
          "nothing else of a feed changes"
        );
        assert.include(
          yield* session.refused([
            "feeds",
            "add",
            blog,
            "--queue",
            "Weekdays",
            ...inStudio,
          ]),
          "--queue goes with --mode queue."
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses a template whose line breaks the shell left as \\n", () =>
    Effect.gen(function* backslashes() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused([
          "feeds",
          "add",
          blog,
          "--template",
          "{title}\\n\\n{link}",
          ...inStudio,
        ]),
        "$'{title}\\n\\n{link}'"
      );
      assert.lengthOf((yield* Ref.get(session.studio.state)).feeds, 0);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("the feeds' examples", () => {
  it("never write a line break a shell would pass as \\n", () => {
    const files = [
      "../peal-docs/docs/cli.mdx",
      "../peal-docs/docs/fr/cli.mdx",
      "../peal-skills/skills/peal/references/saved.md",
    ].map((file) =>
      readFileSync(path.join(import.meta.dirname, "..", file), "utf-8")
    );

    for (const text of files) {
      expect(text).not.toMatch(/--template "[^"]*\\n/u);
    }
  });
});
