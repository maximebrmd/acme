// What the generator leaves out of each package's manifest: the version of
// the files we own, and the names, license, authors and links its templates
// write as placeholders. Each replacement checks it found its text, so a
// generator upgrade that changes a template stops the run here rather than
// shipping a placeholder.
import path from "node:path";

import { Schema } from "effect";

import { description, homepage, repository } from "./languages.ts";
import type { Language, LanguageName } from "./languages.ts";

const decodeManifest = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown))
);

/** Replaces each text once, failing on one the file does not hold. */
const replaceIn = async (
  file: string,
  replacements: readonly (readonly [string, string])[]
): Promise<void> => {
  let content = await Bun.file(file).text();

  for (const [from, to] of replacements) {
    if (!content.includes(from)) {
      throw new Error(
        `${path.basename(file)} no longer holds ${JSON.stringify(from)}`
      );
    }

    content = content.replace(from, to);
  }

  await Bun.write(file, content);
};

const node = async (language: Language, folder: string): Promise<void> => {
  const file = path.join(folder, "package.json");
  const manifest = decodeManifest(await Bun.file(file).text());
  await Bun.write(
    file,
    `${JSON.stringify({ ...manifest, version: language.version }, null, 2)}\n`
  );
};

const python = async (_language: Language, folder: string): Promise<void> => {
  await replaceIn(path.join(folder, "pyproject.toml"), [
    // The import package is peal; the distribution on PyPI is peal-sdk.
    ['name = "peal"\n', 'name = "peal-sdk"\n'],
    ['description = "Peal API"\n', `description = "${description}"\n`],
    [
      'license = { text = "Apache-2.0" }\n',
      'license = "Apache-2.0"\nlicense-files = ["LICENSE"]\n',
    ],
    [
      'keywords = ["OpenAPI", "OpenAPI-Generator", "Peal API"]\n',
      'keywords = ["peal", "social media", "scheduling", "api", "sdk"]\n',
    ],
    ["[project.urls]\n", `[project.urls]\nHomepage = "${homepage}"\n`],
  ]);
};

const dotnet = async (_language: Language, folder: string): Promise<void> => {
  await replaceIn(path.join(folder, "src", "Peal", "Peal.csproj"), [
    ["<Authors>OpenAPI</Authors>", "<Authors>Peal</Authors>"],
    ["<Company>OpenAPI</Company>", "<Company>Peal</Company>"],
    [
      "<AssemblyTitle>OpenAPI Library</AssemblyTitle>",
      "<AssemblyTitle>Peal</AssemblyTitle>",
    ],
    [
      "<Description>A library generated from a OpenAPI doc</Description>",
      `<Description>${description}</Description>\n    <PackageProjectUrl>${homepage}</PackageProjectUrl>`,
    ],
    [
      "<Copyright>No Copyright</Copyright>",
      "<Copyright>Copyright 2026 Peal</Copyright>",
    ],
  ]);
};

/**
 * Maven Central takes signed artifacts through its portal: the profile that
 * signs them, now `release`, signs with BouncyCastle (no gpg binary; the key
 * and its passphrase come from MAVEN_GPG_KEY and MAVEN_GPG_PASSPHRASE) and
 * uploads them with Sonatype's plugin, to the server `central`.
 */
const java = async (_language: Language, folder: string): Promise<void> => {
  await replaceIn(path.join(folder, "pom.xml"), [
    [
      "<id>sign-artifacts</id>\n            <build>",
      "<id>release</id>\n            <build>",
    ],
    [
      "<artifactId>maven-gpg-plugin</artifactId>\n                        <version>3.0.1</version>",
      "<artifactId>maven-gpg-plugin</artifactId>\n                        <version>3.2.8</version>\n                        <configuration>\n                            <signer>bc</signer>\n                        </configuration>",
    ],
    [
      "                    </plugin>\n                </plugins>\n            </build>\n        </profile>",
      "                    </plugin>\n                    <plugin>\n                        <groupId>org.sonatype.central</groupId>\n                        <artifactId>central-publishing-maven-plugin</artifactId>\n                        <version>0.12.0</version>\n                        <extensions>true</extensions>\n                        <configuration>\n                            <publishingServerId>central</publishingServerId>\n                            <autoPublish>true</autoPublish>\n                            <waitUntil>published</waitUntil>\n                        </configuration>\n                    </plugin>\n                </plugins>\n            </build>\n        </profile>",
    ],
  ]);
};

const rust = async (_language: Language, folder: string): Promise<void> => {
  await replaceIn(path.join(folder, "Cargo.toml"), [
    [
      'authors = ["hello@peal.social"]',
      'authors = ["Peal <hello@peal.social>"]',
    ],
    [
      'license = "Apache-2.0"\n',
      `license = "Apache-2.0"\nhomepage = "${homepage}"\nrepository = "${repository}"\n`,
    ],
  ]);
};

type Finisher = (language: Language, folder: string) => Promise<void>;

const finishers = {
  dotnet,
  go: undefined,
  java,
  node,
  php: undefined,
  python,
  ruby: undefined,
  rust,
} satisfies Readonly<Record<LanguageName, Finisher | undefined>>;

export const finish = async (
  language: Language,
  folder: string
): Promise<void> => {
  await finishers[language.name]?.(language, folder);
};
