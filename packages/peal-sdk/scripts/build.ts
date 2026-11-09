// Builds one language's SDK as its registry would receive it, then loads it:
// `bun scripts/build.ts <language>`. Python builds with the workspace's uv;
// the others in their language's image, so nobody installs seven toolchains
// to work on Peal.
import path from "node:path";

import { $ } from "bun";

import { runInContainer, sdkRoot } from "./container.ts";
import { languageNamed } from "./languages.ts";

const language = languageNamed(Bun.argv[2]);
const { build } = language;

await (build.kind === "host"
  ? $`sh -c ${build.script}`.cwd(path.join(sdkRoot, language.name))
  : runInContainer({
      arguments: ["sh", "-c", build.script],
      environment: build.environment,
      image: build.image,
      workdir: `/sdk/${language.name}`,
    }));
