import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { assert, describe, it } from "@effect/vitest";
import { Cron, Effect } from "effect";

// When the server's crons run, read from their sources, so a cron added
// later is checked too. The collections (post counts, accounts' numbers,
// comments) and the token sweep all call platforms through the channels'
// gates, one call at a time per channel with publishing: they must never
// start on the same minute, or their reads queue up in front of a post.

const sources = path.join(import.meta.dirname, "..", "..", "src");

interface Scheduled {
  readonly expression: string;
  readonly name: string;
}

const cronsIn = (source: string): readonly Scheduled[] =>
  source
    .split("ClusterCron.make(")
    .slice(1)
    .flatMap((definition) => {
      const expression = /Cron\.parseUnsafe\(\s*"(?<cron>[^"]+)"/u.exec(
        definition
      )?.groups?.["cron"];

      const name = /name: "(?<name>[a-z]+\.[a-z-]+)"/u.exec(definition)
        ?.groups?.["name"];

      return expression === undefined || name === undefined
        ? []
        : [{ expression, name }];
    });

const everyCron = Effect.promise(async () => {
  const files = await readdir(sources, { recursive: true });

  const read = await Promise.all(
    files
      .filter((file) => file.endsWith(".ts"))
      .map(async (file) => await readFile(path.join(sources, file), "utf-8"))
  );

  return read.flatMap(cronsIn);
});

// The minutes of a day a cron runs on, from 0 to 1439.
const minutesOf = ({ expression }: Scheduled): readonly number[] => {
  const cron = Cron.parseUnsafe(expression, "UTC");

  return Array.from({ length: 24 * 60 }, (_, minute) => minute).filter(
    (minute) => Cron.match(cron, new Date(Date.UTC(2026, 10, 10, 0, minute)))
  );
};

// The crons that call platforms through the channels' gates.
const gated = [
  "analytics.collect-accounts",
  "analytics.collect-metrics",
  "channels.token-refresh",
  "engagement.collect-comments",
];

const collections = new Set(gated.filter((name) => name.includes(".collect-")));

describe("the crons' schedules", () => {
  it.effect("are read for every cron the server registers", () =>
    Effect.gen(function* readsThemAll() {
      const names = (yield* everyCron).map(({ name }) => name);

      assert.lengthOf(names, new Set(names).size);

      for (const name of gated) {
        assert.include(names, name);
      }

      // Each context's retention, the reminders and the sweeps.
      assert.isAtLeast(names.length, 17);
    })
  );

  it.effect("never start two jobs that use the gates on the same minute", () =>
    Effect.gen(function* takesTurns() {
      const crons = (yield* everyCron).filter(({ name }) =>
        gated.includes(name)
      );

      const starting = new Map<number, string[]>();

      for (const cron of crons) {
        for (const minute of minutesOf(cron)) {
          starting.set(minute, [...(starting.get(minute) ?? []), cron.name]);
        }
      }

      assert.deepStrictEqual(
        [...starting.values()].filter((names) => names.length > 1),
        []
      );
    })
  );

  it.effect("start a collection on a minute no other cron starts on", () =>
    Effect.gen(function* collectsAlone() {
      const crons = yield* everyCron;

      const taken = new Set(
        crons.filter(({ name }) => collections.has(name)).flatMap(minutesOf)
      );

      const sharing = crons
        .filter(({ name }) => !collections.has(name))
        .filter((cron) => minutesOf(cron).some((minute) => taken.has(minute)))
        .map(({ name }) => name);

      assert.deepStrictEqual(sharing, []);
    })
  );
});
