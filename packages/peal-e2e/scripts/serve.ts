// Serves Peal for the end-to-end tests: the server on a free port, and the
// web app's production build on the port given as the first argument, with
// /api pointed at that server. The e2e runner starts this script with the
// server's environment (see e2e.config.ts) and stops it when the run ends.
// A signal stops both processes, and either one exiting stops the other.
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import path from "node:path";

import { Schema } from "effect";

const packages = path.join(import.meta.dirname, "..", "..");

const PortSchema = Schema.Int.check(
  Schema.isBetween({ maximum: 65_535, minimum: 1 })
);

const webPort = Schema.decodeUnknownSync(
  Schema.NumberFromString.pipe(Schema.decodeTo(PortSchema))
)(process.argv[2]);

// A port nothing listens on now, for the server. Another process could take
// it before the server binds it: the run then fails to start, and is rerun.
const freePort = async (): Promise<number> => {
  const probe = createServer();

  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");

  const { port } = Schema.decodeUnknownSync(
    Schema.Struct({ port: PortSchema })
  )(probe.address());

  probe.close();
  await once(probe, "close");

  return port;
};

const serverPort = await freePort();

// The server gets every variable the runner passed (DATABASE_URL, PUBLIC_URL
// and the rest); the web app gets PATH, HOME and where the server is. Bun
// runs this script, and runs the server as `nx run peal-server:dev` does.
const server = spawn(process.execPath, ["src/main.ts"], {
  cwd: path.join(packages, "peal-server"),
  env: { ...process.env, PORT: String(serverPort) },
  stdio: "inherit",
});

// `next start` rather than the standalone server, which needs the static
// files copied beside it. Without --hostname it listens on every interface:
// bound to 127.0.0.1, Next rewrites each page to localhost, as an external
// URL, and the page redirects to itself.
const web = spawn(
  path.join(packages, "peal-web", "node_modules", ".bin", "next"),
  ["start", "--port", String(webPort)],
  {
    cwd: path.join(packages, "peal-web"),
    env: {
      HOME: process.env["HOME"] ?? "",
      NEXT_TELEMETRY_DISABLED: "1",
      PATH: process.env["PATH"] ?? "",
      PEAL_API_URL: `http://127.0.0.1:${serverPort}`,
    },
    stdio: "inherit",
  }
);

const children: readonly ChildProcess[] = [server, web];

let stopping = false;

const stopAll = () => {
  stopping = true;

  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
    }
  }
};

process.once("SIGINT", stopAll);

process.once("SIGTERM", stopAll);

const exited = children.map(async (child) => {
  if (child.exitCode === null && child.signalCode === null) {
    await once(child, "exit");
  }
});

await Promise.race(exited);

// A process that exits before the runner asks is a failure.
process.exitCode = stopping ? 0 : 1;

stopAll();

await Promise.all(exited);
