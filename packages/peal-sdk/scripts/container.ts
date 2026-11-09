// Runs a command in an image as the calling user, with packages/peal-sdk at
// /sdk and the tools' caches (Go modules, gems, Maven, NuGet, Composer,
// Cargo) in the workspace's .cache/sdk at /cache: nothing a container writes
// belongs to root, and a second build downloads nothing again.
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { $ } from "bun";

export const sdkRoot = path.join(import.meta.dirname, "..");
export const workspaceRoot = path.join(sdkRoot, "..", "..");
export const cacheRoot = path.join(workspaceRoot, ".cache", "sdk");

interface ContainerRun {
  readonly arguments: readonly string[];
  readonly environment?: Readonly<Record<string, string>>;
  readonly image: string;
  /** Shows the command's output only when it fails. */
  readonly quiet?: boolean;
  /** The working directory, under /sdk. */
  readonly workdir: string;
}

const callingUser = (): string => {
  const uid = process.getuid?.();
  const gid = process.getgid?.();

  if (uid === undefined || gid === undefined) {
    throw new Error(
      "The SDK scripts run containers as the calling user: run them on Linux or macOS."
    );
  }

  return `${uid}:${gid}`;
};

export const runInContainer = async (run: ContainerRun): Promise<void> => {
  await mkdir(path.join(cacheRoot, "home"), { recursive: true });

  const environment = Object.entries({
    HOME: "/cache/home",
    ...run.environment,
  }).flatMap(([name, value]) => ["--env", `${name}=${value}`]);

  const command = $`docker run --rm --user ${callingUser()} --volume ${sdkRoot}:/sdk --volume ${cacheRoot}:/cache --workdir ${run.workdir} ${environment} ${run.image} ${run.arguments}`;

  if (run.quiet !== true) {
    await command;

    return;
  }

  const result = await command.quiet().nothrow();

  if (result.exitCode !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${run.image} exited with ${result.exitCode}`);
  }
};
