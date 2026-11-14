// Decides which of CI's longer jobs a change needs, from the files it changes
// and the projects Nx finds affected by them: `bun scripts/ci-plan.ts`, with
// CI_PLAN_BASE (and CI_PLAN_HEAD, HEAD by default), or CI_PLAN_FULL=true for
// every job. It writes one `<job>=true|false` line per job to GITHUB_OUTPUT,
// or to stdout outside Actions.
//
// Nx's project graph follows imports, not the files a package's tests read
// in another package, so each job also names the folders its tests read. A
// change outside every project (the workflows, a root configuration, these
// scripts) runs every job, as the nightly and manual runs do, but for prose:
// the only Markdown outside a project that a test reads is DESIGN.md.
import { appendFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { $ } from "bun";
import { Schema } from "effect";

export const jobs = ["server", "ansible", "sdks", "e2e"] as const;

export type Job = (typeof jobs)[number];

export type Plan = Readonly<Record<Job, boolean>>;

interface Rule {
  /** Whether a change to this project, or to one it depends on, needs the job. */
  readonly project: (name: string) => boolean;
  /** Folders (ending in `/`) and files outside those projects that the job's tests read. */
  readonly paths: readonly string[];
}

const named =
  (...names: readonly string[]) =>
  (name: string): boolean =>
    names.includes(name);

// The development stack's compose file, which starts the S3 store the
// server's tests and the end-to-end run store media in.
const compose = "packages/peal-docker/compose.yaml";

export const rules: Readonly<Record<Job, Rule>> = {
  ansible: {
    // The release, backup, tunnel and uptime tests read the compose files,
    // the server's catalogue, the web app's routes, the Pulumi stack and the
    // design system's colours.
    paths: [
      "DESIGN.md",
      "packages/peal-docker/",
      "packages/peal-server/",
      "packages/peal-web/",
      "packages/peal-infra/pulumi/",
    ],
    project: named("peal-infra-ansible"),
  },
  e2e: { paths: [compose], project: named("peal-e2e") },
  // The SDKs are generated from the contract, through a task dependency
  // that the project graph does not hold.
  sdks: {
    paths: [],
    project: (name) =>
      name === "peal-contract" ||
      name === "peal-sdk" ||
      name.startsWith("peal-sdk-"),
  },
  // The error catalogue's test reads the docs, and the metric names' test
  // the Ansible roles' alerts and dashboards.
  server: {
    paths: [compose, "packages/peal-docs/", "packages/peal-infra/ansible/"],
    project: named("peal-server"),
  },
};

export interface Change {
  /** The files the change adds, modifies or deletes. */
  readonly files: readonly string[];
  /** The projects Nx finds affected by those files. */
  readonly affected: readonly string[];
  /** Every project's root folder. */
  readonly roots: readonly string[];
}

/**
 * The files that belong to no project, which may change any of them. Prose
 * is left out: agent instructions, which no target reads, the README, the
 * contributing guide and the like. A rule names the one a test reads.
 */
export const outsideProjects = (change: Change): readonly string[] =>
  change.files.filter(
    (file) =>
      !file.endsWith(".md") &&
      !change.roots.some((root) => file.startsWith(`${root}/`))
  );

export const everything: Plan = {
  ansible: true,
  e2e: true,
  sdks: true,
  server: true,
};

export const plan = (change: Change): Plan => {
  if (outsideProjects(change).length > 0) {
    return everything;
  }

  const needs = (job: Job): boolean =>
    change.affected.some(rules[job].project) ||
    change.files.some((file) =>
      rules[job].paths.some((entry) =>
        entry.endsWith("/") ? file.startsWith(entry) : file === entry
      )
    );

  return {
    ansible: needs("ansible"),
    e2e: needs("e2e"),
    sdks: needs("sdks"),
    server: needs("server"),
  };
};

const decodeNames = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Array(Schema.String))
);

const decodeGraph = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      graph: Schema.Struct({
        nodes: Schema.Record(
          Schema.String,
          Schema.Struct({ data: Schema.Struct({ root: Schema.String }) })
        ),
      }),
    })
  )
);

const lines = (text: string): readonly string[] =>
  text.split("\n").filter((line) => line !== "");

const projectRoots = async (): Promise<readonly string[]> => {
  const folder = await mkdtemp(path.join(tmpdir(), "ci-plan-"));

  try {
    const file = path.join(folder, "graph.json");
    await $`bun nx graph --file=${file}`.quiet();
    const { graph } = decodeGraph(await Bun.file(file).text());

    return Object.values(graph.nodes).map((node) => node.data.root);
  } finally {
    await rm(folder, { force: true, recursive: true });
  }
};

const readChange = async (base: string, head: string): Promise<Change> => {
  const found = await $`git merge-base ${base} ${head}`.text();
  const mergeBase = found.trim();

  const files = lines(
    await $`git diff --name-only ${mergeBase} ${head}`.text()
  );

  const affected = decodeNames(
    await $`bun nx show projects --affected --base=${mergeBase} --head=${head} --json`.text()
  );

  return { affected, files, roots: await projectRoots() };
};

const decodeEnvironment = Schema.decodeUnknownSync(
  Schema.Struct({
    CI_PLAN_BASE: Schema.optional(Schema.String),
    CI_PLAN_FULL: Schema.optional(Schema.String),
    CI_PLAN_HEAD: Schema.optional(Schema.String),
    GITHUB_OUTPUT: Schema.optional(Schema.String),
  })
);

const main = async (): Promise<void> => {
  const environment = decodeEnvironment(process.env);
  const base = environment.CI_PLAN_BASE ?? "";
  const full = environment.CI_PLAN_FULL === "true" || base === "";

  const change = full
    ? undefined
    : await readChange(base, environment.CI_PLAN_HEAD ?? "HEAD");

  const result = change === undefined ? everything : plan(change);
  const output = jobs.map((job) => `${job}=${result[job]}\n`).join("");

  if (change !== undefined) {
    const outside = outsideProjects(change);
    process.stderr.write(
      outside.length > 0
        ? `Every job: these files belong to no project:\n${outside.join("\n")}\n`
        : `Affected projects: ${change.affected.join(", ") || "none"}\n`
    );
  }

  const target = environment.GITHUB_OUTPUT;
  await (target === undefined
    ? Promise.resolve(process.stdout.write(output))
    : appendFile(target, output));
};

if (import.meta.main) {
  await main();
}
