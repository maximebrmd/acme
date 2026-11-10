import { BunRuntime } from "@effect/platform-bun";
import { Console, DateTime, Effect } from "effect";

import { ErasureReplayServicesLive } from "#app/server.ts";
import { ReplayErasures } from "#workspace/application/replay-erasures.ts";

// After the database was restored from a backup, and before the server
// starts: erases again every account and workspace deleted since that
// backup, from the ledger kept in the object store, and prints what it
// did, ids only. It applies pending migrations first, as the server would,
// and runs no HTTP server, worker or cron. Safe to run again: what is gone
// stays gone. `--apply-unconfirmed` also applies the erasures whose end the
// server never recorded, which are otherwise listed and left. It exits
// with a failure when an erasure was refused, so nobody starts the server
// on what was to be erased.
//
//   bun src/replay-erasures.ts [--apply-unconfirmed]
const applyUnconfirmed = process.argv.includes("--apply-unconfirmed");

const program = Effect.gen(function* replayErasures() {
  const replays = yield* ReplayErasures;
  const report = yield* replays.replay({ applyUnconfirmed });

  yield* Console.log(
    `Erasure ledger: ${report.entries} entries, ${report.erased.length} erased again, ${report.alreadyGone} already gone, ${report.unconfirmed.length} unconfirmed and left, ${report.failed.length} refused.`
  );

  const lines = [
    ...report.erased.map(
      ({ account, id, workspaces }) =>
        `erased again  ${id}  account ${account ?? "-"}  workspaces ${workspaces.join(",") || "-"}`
    ),
    ...report.unconfirmed.map(
      ({ at, id, userId, workspaceIds }) =>
        `unconfirmed   ${id}  account ${userId ?? "-"}  workspaces ${workspaceIds.join(",") || "-"}  at ${DateTime.formatIso(at)}`
    ),
    ...report.failed.map(({ id, reason }) => `refused       ${id}  ${reason}`),
  ];

  yield* Console.log(lines.join("\n"));

  if (report.failed.length > 0) {
    yield* Effect.fail(
      new Error(
        `${report.failed.length} erasures were refused: keep the server stopped until each is applied`
      )
    );
  }
});

BunRuntime.runMain(program.pipe(Effect.provide(ErasureReplayServicesLive)));
