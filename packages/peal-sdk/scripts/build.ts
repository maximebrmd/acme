// Builds one language's SDK as its registry would receive it, then loads it:
// `bun scripts/build.ts <language>`. TypeScript and Python build with the
// workspace's own tools; the others in their language's image, so nobody
// installs seven toolchains to work on Peal.
import path from "node:path";

import { $ } from "bun";

import { runInContainer, sdkRoot, workspaceRoot } from "./container.ts";
import { languageNamed } from "./languages.ts";

const language = languageNamed(Bun.argv[2]);
const { build } = language;

await (build.kind === "host"
  ? $`sh -c ${build.script}`.cwd(path.join(sdkRoot, language.name)).env({
      ...process.env,
      TSC: path.join(workspaceRoot, "node_modules", ".bin", "tsc"),
    })
  : runInContainer({
      arguments: ["sh", "-c", build.script],
      environment: build.environment,
      image: build.image,
      workdir: `/sdk/${language.name}`,
    }));
