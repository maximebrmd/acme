// What the operator declares about its processing, read from the file
// PEAL_PRIVACY_DECLARATION_FILE names when the server starts.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Exit, Layer } from "effect";

import { PrivacyDeclaration } from "#workspace/application/privacy-declaration.ts";
import { undeclared } from "#workspace/domain/operator-declaration.ts";
import { PrivacyDeclarationLive } from "#workspace/infrastructure/privacy-declaration-file.ts";

const withSettings = (settings: Readonly<Record<string, string>>) =>
  PrivacyDeclaration.use((declaration) => Effect.succeed(declaration)).pipe(
    Effect.provide(
      PrivacyDeclarationLive.pipe(
        Layer.provide(
          ConfigProvider.layer(ConfigProvider.fromUnknown(settings))
        )
      )
    )
  );

const written = (content: string) => {
  const folder = mkdtempSync(path.join(os.tmpdir(), "peal-declaration-"));
  const file = path.join(folder, "privacy-declaration.json");

  writeFileSync(file, content);

  return {
    file,
    remove: () => {
      rmSync(folder, { force: true, recursive: true });
    },
  };
};

describe("the operator's privacy declaration", () => {
  it.effect("declares nothing, and bills nothing, unless told", () =>
    Effect.gen(function* nothing() {
      const declaration = yield* withSettings({});

      assert.deepStrictEqual(declaration.declared, undeclared);
      assert.isFalse(declaration.bills);
    })
  );

  it.effect(
    "reads who runs the server and its sub-processors from the file",
    () =>
      Effect.gen(function* reads() {
        const { file, remove } = written(
          JSON.stringify({
            controller: {
              contact: "privacy@example.test",
              name: "Synthetic Operator SAS",
            },
            policyUrl: "https://example.test/privacy/",
            recipients: [
              {
                country: "France",
                name: "Synthetic Hosting",
                service: "Hosting",
              },
            ],
          })
        );

        const { declared } = yield* withSettings({
          PEAL_PRIVACY_DECLARATION_FILE: file,
        }).pipe(Effect.ensuring(Effect.sync(remove)));

        assert.deepStrictEqual(declared, {
          ...undeclared,
          controller: {
            address: null,
            contact: "privacy@example.test",
            dataProtectionOfficer: null,
            name: "Synthetic Operator SAS",
          },
          policyUrl: "https://example.test/privacy/",
          recipients: [
            {
              country: "France",
              name: "Synthetic Hosting",
              safeguard: null,
              service: "Hosting",
            },
          ],
        });
      })
  );

  it.effect("stops the server on a file that is missing or malformed", () =>
    Effect.gen(function* refuses() {
      const { file, remove } = written('{"recipients": "everyone"}');

      const malformed = yield* Effect.exit(
        withSettings({ PEAL_PRIVACY_DECLARATION_FILE: file })
      ).pipe(Effect.ensuring(Effect.sync(remove)));

      const missing = yield* Effect.exit(
        withSettings({ PEAL_PRIVACY_DECLARATION_FILE: `${file}.absent` })
      );

      assert.isTrue(Exit.isFailure(malformed));
      assert.isTrue(Exit.isFailure(missing));
    })
  );
});
