import { defineConfig } from "oxlint";
import type { OxlintOverride } from "oxlint";
import drizzle from "ultracite/oxlint/drizzle";
import vitest from "ultracite/oxlint/vitest";

import root from "../../oxlint.config.ts";

// Clean Architecture, enforced. Each bounded context under src/ has four
// layers, and every import between folders goes through `#<context>/<layer>/…`
// (package.json "imports"), so these patterns can tell layers apart. Patterns
// follow .gitignore rules: later lines win, and `!` allows again.

const contexts = [
  "publishing",
  "channels",
  "media",
  "workspace",
  "analytics",
  "billing",
  "notifications",
] as const;

type Kernel = (typeof contexts)[number] | "shared";

type Rules = NonNullable<OxlintOverride["rules"]>;

const restrict = (
  message: string,
  group: readonly string[]
): NonNullable<Rules["no-restricted-imports"]> => [
  "error",
  { patterns: [{ group: [...group], message }] },
];

// Domain: entities and rules, built on Effect's core only.
const domain = (context: Kernel) =>
  restrict(
    "The domain imports `effect`, its own domain and the shared domain only. Move adapters to infrastructure.",
    ["*", "!effect", "!./**", `!#${context}/domain/**`, "!#shared/domain/**"]
  );

// Application: use cases and the ports (Context.Service) they need.
const application = (context: Kernel) =>
  restrict(
    "Use cases import `effect`, their context's domain and application, and the shared kernel. Reach outside services through a port.",
    [
      "*",
      "!effect",
      "!./**",
      `!#${context}/domain/**`,
      `!#${context}/application/**`,
      "!#shared/domain/**",
      "!#shared/application/**",
    ]
  );

// Infrastructure: adapters behind the ports. Any package; other contexts only
// through their use cases.
const infrastructure = (context: Kernel) =>
  restrict(
    "Adapters may use any package, their own context, the shared kernel and other contexts' application layer, never another context's internals or an api layer.",
    [
      "*/domain/**",
      "*/infrastructure/**",
      "*/api/**",
      "*/container.ts",
      "?app/**",
      `!#${context}/domain/**`,
      `!#${context}/infrastructure/**`,
      "!#shared/**",
    ]
  );

// Api: HttpApiBuilder handlers for acme-contract. Use cases come from the
// context's container, never from infrastructure.
const api = (context: Kernel) =>
  restrict(
    "Handlers import Effect, acme-contract, their context's container, domain and application, and the shared kernel. Infrastructure stays behind the container.",
    [
      "*",
      "!effect",
      "!effect/**",
      "!acme-contract",
      "!./**",
      `!#${context}/container.ts`,
      `!#${context}/domain/**`,
      `!#${context}/application/**`,
      "!#shared/domain/**",
      "!#shared/application/**",
      "!#shared/api/**",
    ]
  );

// The container wires one context's layers together.
const container = (context: Kernel) =>
  restrict("A container wires its own context and the shared kernel only.", [
    "*/domain/**",
    "*/application/**",
    "*/infrastructure/**",
    "*/api/**",
    "*/container.ts",
    "?app/**",
    `!#${context}/**`,
    "!#shared/**",
  ]);

// Time, ids and configuration come from Effect services, so tests control them.
const pureGlobals: NonNullable<Rules["no-restricted-globals"]> = [
  "error",
  {
    message: "Use DateTime or Clock from effect, which tests control.",
    name: "Date",
  },
  { message: "Take ids and randomness from a port.", name: "crypto" },
  { message: "Read configuration with Config from effect.", name: "process" },
  { message: "Runtime APIs belong in infrastructure.", name: "Bun" },
];

const layerOverrides: OxlintOverride[] = (
  ["shared", ...contexts] as const
).flatMap((context) => [
  {
    files: [`src/${context}/domain/**`],
    rules: {
      "no-restricted-globals": pureGlobals,
      "no-restricted-imports": domain(context),
    },
  },
  {
    files: [`src/${context}/application/**`],
    rules: {
      "no-restricted-globals": pureGlobals,
      "no-restricted-imports": application(context),
    },
  },
  {
    files: [`src/${context}/infrastructure/**`],
    rules: { "no-restricted-imports": infrastructure(context) },
  },
  {
    files: [`src/${context}/api/**`],
    rules: { "no-restricted-imports": api(context) },
  },
  {
    files: [`src/${context}/container.ts`],
    rules: { "no-restricted-imports": container(context) },
  },
]);

// Oxlint lints each file with its nearest config alone, so this extends the
// root config and repeats the properties that extends doesn't carry over.
export default defineConfig({
  env: root.env ?? {},
  extends: [root, drizzle, vitest],
  ignorePatterns: root.ignorePatterns ?? [],
  overrides: [
    {
      // Folders import each other through `#…`, which the layer rules read.
      files: ["src/**", "test/**"],
      rules: { "import/no-relative-parent-imports": "error" },
    },
    ...layerOverrides,
  ],
});
