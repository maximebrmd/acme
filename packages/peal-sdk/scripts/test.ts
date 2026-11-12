// Runs one language's smoke test against a stand-in API:
// `bun scripts/test.ts <language>`, after its sdk:build. The stand-in answers
// the health check, and the signed-in user to the bearer token peal_test
// only. The test calls both through the SDK as its users would, and checks
// the answer; the run passes only when the stand-in saw both calls.
import path from "node:path";

import { $ } from "bun";

import { runInContainer, sdkRoot } from "./container.ts";
import { languageNamed } from "./languages.ts";

const language = languageNamed(Bun.argv[2]);

/** The token every smoke test sends, and the only one the stand-in accepts. */
const token = "peal_test";

/** GET /api/me's answer, with the nulls and the enum the SDKs must decode. */
const me = {
  impersonatedBy: null,
  user: {
    email: "ada@example.test",
    emailVerified: true,
    id: "user-1",
    image: null,
    locale: "en",
    name: "Ada",
    twoStepEnabled: false,
  },
  workspaces: [
    {
      id: "workspace-1",
      name: "Studio",
      permissions: ["post:schedule", "media:upload"],
      role: "owner",
      slug: "studio",
      twoStepRequired: false,
    },
  ],
};

const seen = { health: false, me: false };

const server = Bun.serve({
  fetch: (request) => {
    const { pathname } = new URL(request.url);

    if (request.method === "GET" && pathname === "/api/health") {
      seen.health = true;

      return new Response(null, { status: 204 });
    }

    if (request.method === "GET" && pathname === "/api/me") {
      if (request.headers.get("authorization") !== `Bearer ${token}`) {
        return Response.json({ _tag: "Unauthenticated" }, { status: 401 });
      }

      seen.me = true;

      return Response.json(me);
    }

    return new Response(null, { status: 404 });
  },
  // Containers reach this machine through host.docker.internal, which on
  // Linux is the Docker bridge's address rather than the loopback.
  hostname: process.platform === "linux" ? "0.0.0.0" : "127.0.0.1",
  port: 0,
});

try {
  const { build } = language;

  await (build.kind === "host"
    ? $`sh -c ${language.test}`.cwd(path.join(sdkRoot, language.name)).env({
        ...process.env,
        PEAL_API_URL: `http://127.0.0.1:${server.port}`,
      })
    : runInContainer({
        arguments: ["sh", "-c", language.test],
        environment: {
          ...build.environment,
          PEAL_API_URL: `http://host.docker.internal:${server.port}`,
        },
        image: build.image,
        workdir: `/sdk/${language.name}`,
      }));
} finally {
  await server.stop(true);
}

if (!seen.health || !seen.me) {
  throw new Error(
    `The ${language.name} SDK's smoke test passed without calling ${seen.health ? "" : "the health check "}${seen.me ? "" : "GET /api/me with its token"}.`
  );
}
