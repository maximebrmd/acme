import { assert, describe, expect, it } from "@effect/vitest";
import { ConfigProvider, Effect, Option, Redacted } from "effect";

import {
  publicObjectUrl,
  S3StorageConfig,
} from "#media/infrastructure/s3-media-storage.ts";

const settingsFrom = (values: Readonly<Record<string, string>>) =>
  S3StorageConfig.parse(ConfigProvider.fromUnknown(values));

const required = {
  NODE_ENV: "production",
  PEAL_S3_ACCESS_KEY_ID: "synthetic-key",
  PEAL_S3_BUCKET: "media",
  PEAL_S3_ENDPOINT: "https://storage.example.test",
  PEAL_S3_SECRET_ACCESS_KEY: "synthetic-secret",
};

describe("the S3 store's settings", () => {
  it.effect("default to R2's region, virtual hosts and no prefix", () =>
    Effect.gen(function* defaults() {
      const settings = yield* settingsFrom(required);

      assert.strictEqual(settings.region, "auto");
      assert.isFalse(settings.forcePathStyle);
      assert.strictEqual(settings.keyPrefix, "");
      assert.isTrue(Option.isNone(settings.publicBaseUrl));
    })
  );

  it.effect.each([
    "PEAL_S3_ACCESS_KEY_ID",
    "PEAL_S3_BUCKET",
    "PEAL_S3_ENDPOINT",
    "PEAL_S3_SECRET_ACCESS_KEY",
  ] as const)("need %s in production", (name) =>
    Effect.gen(function* missing() {
      const { [name]: _missing, ...others } = required;
      const error = yield* Effect.flip(settingsFrom(others));

      assert.strictEqual(error._tag, "ConfigError");
    })
  );

  it.effect("default to the development stack's SeaweedFS elsewhere", () =>
    Effect.gen(function* development() {
      const settings = yield* settingsFrom({});

      assert.strictEqual(settings.endpoint.href, "http://127.0.0.1:18333/");
      assert.strictEqual(settings.bucket, "peal-media");
      assert.strictEqual(Redacted.value(settings.accessKeyId), "peal");
      assert.isTrue(settings.forcePathStyle);
    })
  );

  it.effect("refuse a key prefix that does not end with a slash", () =>
    Effect.gen(function* prefix() {
      const error = yield* Effect.flip(
        settingsFrom({ ...required, PEAL_S3_KEY_PREFIX: "staging" })
      );

      assert.strictEqual(error._tag, "ConfigError");
    })
  );

  it.effect("refuse a public base URL that is not a URL", () =>
    Effect.gen(function* publicBase() {
      const error = yield* Effect.flip(
        settingsFrom({ ...required, PEAL_MEDIA_PUBLIC_BASE_URL: "media" })
      );

      assert.strictEqual(error._tag, "ConfigError");
    })
  );
});

describe(publicObjectUrl, () => {
  const key = "staging/media/w/a.png";

  it.each(["https://media.example.test", "https://media.example.test/"])(
    "puts the key at the root of %s",
    (base) => {
      expect(publicObjectUrl(new URL(base), key)).toBe(
        "https://media.example.test/staging/media/w/a.png"
      );
    }
  );

  it("keeps a base path", () => {
    expect(publicObjectUrl(new URL("https://cdn.example.test/peal"), key)).toBe(
      "https://cdn.example.test/peal/staging/media/w/a.png"
    );
  });

  it("escapes each segment of the key", () => {
    expect(
      publicObjectUrl(new URL("https://cdn.example.test"), "a b/c?d.png")
    ).toBe("https://cdn.example.test/a%20b/c%3Fd.png");
  });
});
