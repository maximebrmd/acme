import { web } from "@e2e-dev/web";
import type { E2EConfig } from "e2e";

// The run serves Acme itself (scripts/serve.ts): the server and the web app's
// production build, each on a free port, against the services below. They
// default to the development stack (`bun nx run acme-docker:up`); CI names
// its own. The database is the one DATABASE_URL names, which the run writes
// to, as the server's tests do.
const databaseUrl = process.env["DATABASE_URL"] ?? "";

if (databaseUrl === "") {
  throw new Error(
    "Set DATABASE_URL to the Postgres database the end-to-end tests may write to."
  );
}

const setting = (name: string, developmentDefault: string): string =>
  process.env[name] ?? developmentDefault;

// The web app's address: it serves the pages and forwards /api to the server,
// so it is the server's PUBLIC_URL too, which the emailed links point at.
const url = "http://127.0.0.1:0";

// Synthetic values, which sign and encrypt nothing outside these runs. The
// token key is 32 bytes, for AES-256-GCM.
const authSecret = "acme-e2e-synthetic-auth-secret-0f6b2d9e4a1c7e3b";
const tokenKeys = "e2e:YWNtZS1lMmUtc3ludGhldGljLXRva2VuLWtleS0wMDE=";

export default {
  // The account each run signs up, under a new address every time (see
  // tests/first-post.e2e.ts). E2E_USER_MEMBER_PASSWORD overrides the password.
  credentials: {
    member: {
      password: "synthetic e2e password",
      username: "member@example.test",
    },
  },
  targets: [
    {
      app: {
        command: {
          args: ["scripts/serve.ts", "{port}"],
          env: {
            ACME_S3_ACCESS_KEY_ID: setting("ACME_S3_ACCESS_KEY_ID", "acme"),
            ACME_S3_BUCKET: setting("ACME_S3_BUCKET", "acme-media"),
            ACME_S3_ENDPOINT: setting(
              "ACME_S3_ENDPOINT",
              "http://127.0.0.1:18333"
            ),
            ACME_S3_KEY_PREFIX: setting("ACME_S3_KEY_PREFIX", "e2e/"),
            ACME_S3_SECRET_ACCESS_KEY: setting(
              "ACME_S3_SECRET_ACCESS_KEY",
              "acme-development-secret"
            ),
            ACME_TOKEN_KEYS: tokenKeys,
            BETTER_AUTH_SECRET: authSecret,
            DATABASE_URL: databaseUrl,
            MAIL_FROM: "Acme <noreply@acme.test>",
            PUBLIC_URL: "http://127.0.0.1:{port}",
            SMTP_URL: setting("SMTP_URL", "smtp://127.0.0.1:11025"),
          },
          executable: "bun",
          log: ".e2e/logs/app.log",
          // The server migrates the database before it listens.
          startupTimeout: 120_000,
        },
        // Through the web app to the server's readiness check, which answers
        // once the server is migrated and listening.
        readyUrl: "http://127.0.0.1:{port}/api/ready",
        url,
      },
      // Chromium in English and in UTC, whatever the machine's settings, so
      // pages open in English and times read the same everywhere.
      engine: web({ locale: "en-US", timezoneId: "UTC" }),
    },
  ],
  tests: "tests/**/*.e2e.ts",
} satisfies E2EConfig;
