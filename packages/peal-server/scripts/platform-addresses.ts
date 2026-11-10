// Prints every address to register with each platform's app, and those the
// platforms read by themselves, for the origin PUBLIC_URL names: redirect
// URIs, Meta's data deletion and deauthorize callbacks, Bluesky's client
// documents. From the repository root:
//
//   PUBLIC_URL=https://peal.example.com bun nx run peal-server:platform-addresses
//
// or on a running server, which answers for its own PUBLIC_URL:
//
//   docker compose … exec server bun packages/peal-server/scripts/platform-addresses.ts
//
// `--json` prints the same list for a program to read. The list is built
// from the paths the sign-ins and the routes themselves use
// (src/channels/infrastructure/platforms/platform-addresses.ts), so it is
// the one place to read them from. It reads PUBLIC_URL as the server does,
// and nothing else: no secret, no database, no network.
import { BunRuntime } from "@effect/platform-bun";
import { Console, Effect } from "effect";

import {
  describeRegistrations,
  platformRegistrations,
} from "#channels/infrastructure/platforms/platform-addresses.ts";
import { publicUrlConfig } from "#shared/infrastructure/environment.ts";

const program = Effect.gen(function* platformAddresses() {
  const publicUrl = yield* publicUrlConfig;
  const registrations = platformRegistrations(publicUrl);

  yield* Console.log(
    process.argv.includes("--json")
      ? JSON.stringify({ publicUrl, registrations }, null, 2)
      : describeRegistrations(publicUrl, registrations)
  );
});

BunRuntime.runMain(program);
