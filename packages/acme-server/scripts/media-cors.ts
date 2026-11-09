// Lets browsers upload to the media bucket: puts the CORS rule they need on
// it, then prints the same rule for Cloudflare R2's dashboard. Run it once
// per bucket, from the repository root:
//
//   bun nx run acme-server:media-cors
//
// Without settings it targets the development stack's SeaweedFS
// (packages/acme-docker/compose.yaml), with the web app's development origin,
// http://localhost:3001. The server's variables point it elsewhere:
// ACME_S3_* for the bucket (see src/media/infrastructure/s3-media-storage.ts),
// PUBLIC_URL and TRUSTED_ORIGINS for the origins the web app runs at.
//
// It only changes the bucket's CORS configuration, never its objects, and
// keeps the rules it did not write. Running it again changes nothing.
import { BunRuntime } from "@effect/platform-bun";
import { Config, ConfigProvider, Console, Effect, Schema } from "effect";

import {
  applyUploadRule,
  r2Policy,
  uploadRule,
} from "#media/infrastructure/bucket-cors.ts";
import { S3StorageConfig } from "#media/infrastructure/s3-media-storage.ts";

// The development stack's defaults, under whatever the environment sets.
const developmentStack = ConfigProvider.layerAdd(
  ConfigProvider.fromUnknown({
    ACME_S3_ACCESS_KEY_ID: "acme",
    ACME_S3_BUCKET: "acme-media",
    ACME_S3_ENDPOINT: "http://127.0.0.1:18333",
    ACME_S3_FORCE_PATH_STYLE: "true",
    ACME_S3_SECRET_ACCESS_KEY: "acme-development-secret",
  })
);

const OriginsConfig = Config.all({
  publicUrl: Config.URL("PUBLIC_URL").pipe(
    Config.withDefault(new URL("http://localhost:3001"))
  ),
  trustedOrigins: Config.Array(Schema.String, "TRUSTED_ORIGINS").pipe(
    Config.withDefault([])
  ),
});

const decodeOrigin = Schema.decodeUnknownEffect(Schema.URLFromString);

const program = Effect.gen(function* mediaCors() {
  const settings = yield* S3StorageConfig;
  const { publicUrl, trustedOrigins } = yield* OriginsConfig;

  // TRUSTED_ORIGINS is comma-separated, as the server reads it.
  const trusted = yield* Effect.forEach(
    trustedOrigins.map((entry) => entry.trim()).filter((entry) => entry !== ""),
    (entry) => decodeOrigin(entry).pipe(Effect.map((url) => url.origin))
  );

  const origins = [publicUrl.origin, ...trusted];

  const rule = uploadRule(origins);
  const { changed } = yield* applyUploadRule(settings, rule);
  const where = `bucket ${settings.bucket} at ${settings.endpoint.origin}`;

  yield* Console.log(
    changed
      ? `Browser uploads from ${rule.AllowedOrigins?.join(", ")} are now allowed on the ${where}.`
      : `The ${where} already allows browser uploads from ${rule.AllowedOrigins?.join(", ")}.`
  );

  yield* Console.log(
    [
      "",
      "On Cloudflare R2, paste this policy in the dashboard (R2 > the bucket > Settings > CORS policy), with the origins the web app runs at:",
      "",
      JSON.stringify(r2Policy(rule), null, 2),
    ].join("\n")
  );
});

BunRuntime.runMain(
  program.pipe(Effect.scoped, Effect.provide(developmentStack))
);
