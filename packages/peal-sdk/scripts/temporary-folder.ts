import { mkdtemp } from "node:fs/promises";
import path from "node:path";

/** Where a run's temporary folder goes, and how it is removed. */
export interface TemporaryFolderOptions {
  /** Its name's start: a random suffix follows, so no two runs share it. */
  readonly name: string;
  /** Removes it and all it holds, whoever wrote there. */
  readonly remove: (folder: string) => Promise<void>;
  /** The folder it goes in, such as the system's temporary folder. */
  readonly root: string;
}

/**
 * Runs `body` with a temporary folder of its own, made anew under `root`,
 * and removes it afterwards, the run failed or not, and when the process
 * is interrupted or terminated meanwhile. Runs from different worktrees,
 * or languages generated in parallel, never share a folder.
 */
export const withTemporaryFolder = async <A>(
  { name, remove, root }: TemporaryFolderOptions,
  body: (folder: string) => Promise<A>
): Promise<A> => {
  const folder = await mkdtemp(path.join(root, `${name}-`));

  const removeOnSignal = (signal: NodeJS.Signals) => {
    void remove(folder).finally(() => {
      process.kill(process.pid, signal);
    });
  };

  process.once("SIGINT", removeOnSignal);
  process.once("SIGTERM", removeOnSignal);

  try {
    return await body(folder);
  } finally {
    process.off("SIGINT", removeOnSignal);
    process.off("SIGTERM", removeOnSignal);
    await remove(folder);
  }
};
