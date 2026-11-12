import { Effect, Layer } from "effect";
import { CliOutput } from "effect/cli";
import type { Command, HelpDoc } from "effect/cli";

import { cli, runWith } from "#cli.ts";

import { cliEnvironment, fetching } from "./support.ts";

// The command line's own tree, read from the commands themselves: the
// subcommands a command declares (effect/cli's public `subcommands`), and
// for each one the flags and arguments of the help document effect/cli
// builds for `--help`, taken as data before it is formatted.

const pathsUnder = (
  command: Command.Command.Any,
  path: readonly string[]
): readonly (readonly string[])[] =>
  command.subcommands.flatMap(({ commands }) =>
    commands.flatMap((child) => {
      const here = [...path, child.name];

      return [here, ...pathsUnder(child, here)];
    })
  );

/** Every command and group, as the words typed after `peal`. */
export const commandPaths: readonly string[] = pathsUnder(cli, []).map((path) =>
  path.join(" ")
);

export interface CommandUsage {
  /** How many arguments it takes, and whether the last repeats. */
  readonly arguments: readonly HelpDoc.ArgDoc[];
  /** Every flag it accepts, with its dashes: its own, inherited and global. */
  readonly flags: ReadonlySet<string>;
  /** The flags that take no value. */
  readonly switches: ReadonlySet<string>;
}

const dashed = (name: string): string =>
  name.startsWith("-") ? name : `--${name}`;

// A boolean flag also takes its negation, `--no-<name>`, which effect/cli
// accepts unless the flag says otherwise (no command does) and which its
// help document does not list.
const namesOf = (flags: readonly HelpDoc.FlagDoc[]): string[] =>
  flags.flatMap(({ aliases, name, type }) =>
    [
      name,
      ...aliases,
      ...(type === "boolean" && !name.startsWith("-") ? [`no-${name}`] : []),
    ].map(dashed)
  );

/**
 * What a command takes, from the help document of `peal <command> --help`.
 * Nothing is requested: help never reaches the API.
 */
export const usageOf = (command: string) =>
  Effect.gen(function* usage() {
    const documents: HelpDoc.HelpDoc[] = [];

    yield* runWith([...command.split(" "), "--help"]).pipe(
      Effect.provide(
        Layer.mergeAll(
          CliOutput.layerPresenter({
            present: (event) =>
              Effect.sync(() => {
                if (event._tag === "Help") {
                  documents.push(event.helpDoc);
                }
              }),
          }),
          cliEnvironment(),
          fetching(() => new Response(null, { status: 204 }))
        )
      )
    );

    const [document] = documents;

    if (document === undefined) {
      return yield* Effect.die(`peal ${command} --help showed no help`);
    }

    const all = [
      ...document.flags,
      ...(document.inheritedFlags ?? []),
      ...(document.globalFlags ?? []),
    ];

    return {
      arguments: document.args ?? [],
      flags: new Set(namesOf(all)),
      switches: new Set(namesOf(all.filter(({ type }) => type === "boolean"))),
    } satisfies CommandUsage;
  });
