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
      'license = "Apache-2.0"\nlicense-files = ["LICENSE", "NOTICE"]\n',
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
    // The generator's notes say "Minor update" whatever changed.
    ["    <PackageReleaseNotes>Minor update</PackageReleaseNotes>\n", ""],
    // NuGet shows the README in the package: ours, beside src/. The license
    // and the notice go in beside it.
    [
      "<PackageTags>",
      "<PackageReadmeFile>README.md</PackageReadmeFile>\n    <PackageTags>",
    ],
    [
      "</Project>",
      '  <ItemGroup>\n    <None Include="..\\..\\README.md" Pack="true" PackagePath="\\" />\n    <None Include="..\\..\\LICENSE" Pack="true" PackagePath="\\" />\n    <None Include="..\\..\\NOTICE" Pack="true" PackagePath="\\" />\n  </ItemGroup>\n</Project>',
    ],
  ]);

  // System.Text.Json takes the first converter that handles a type, and the
  // generator registers the catch-all enum one first. It reads member names,
  // so a list of permissions ("post:schedule") failed to decode: registered
  // last, it only handles what no generated converter does.
  const enumConverter =
    "            _jsonOptions.Converters.Add(new JsonStringEnumConverter());\n";

  const provider =
    "            JsonSerializerOptionsProvider jsonSerializerOptionsProvider = new(_jsonOptions);\n";

  await replaceIn(
    path.join(folder, "src", "Peal", "Client", "HostConfiguration.cs"),
    [
      [enumConverter, ""],
      [provider, `${enumConverter}${provider}`],
    ]
  );
};

/** The gem holds the library, its README and its license: no Gemfile or lock file. */
const ruby = async (_language: Language, folder: string): Promise<void> => {
  await replaceIn(path.join(folder, "peal.gemspec"), [
    [
      '  s.files         = `find *`.split("\\n").uniq.sort.select { |f| !f.empty? }\n',
      '  s.files         = Dir["lib/**/*.rb", "README.md", "LICENSE", "NOTICE"]\n',
    ],
    ['  s.test_files    = `find spec/*`.split("\\n")\n', ""],
  ]);
};

/**
 * Maven Central takes signed artifacts through its portal: the profile that
 * signs them, now `release`, signs with BouncyCastle (no gpg binary; the key
 * and its passphrase come from MAVEN_GPG_KEY and MAVEN_GPG_PASSPHRASE) and
 * uploads them with Sonatype's plugin, to the server `central`. The jar
 * carries the license and the notice in META-INF, as Apache's own jars do.
 */
const java = async (_language: Language, folder: string): Promise<void> => {
  await replaceIn(path.join(folder, "pom.xml"), [
    [
      "    <build>\n        <plugins>\n",
      "    <build>\n        <resources>\n            <resource>\n                <directory>src/main/resources</directory>\n            </resource>\n            <resource>\n                <directory>.</directory>\n                <targetPath>META-INF</targetPath>\n                <includes>\n                    <include>LICENSE</include>\n                    <include>NOTICE</include>\n                </includes>\n            </resource>\n        </resources>\n        <plugins>\n",
    ],
    [
      "<id>sign-artifacts</id>\n            <build>",
      "<id>release</id>\n            <build>",
    ],
    [
      "<artifactId>maven-gpg-plugin</artifactId>\n                        <version>3.2.1</version>",
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
      `license = "Apache-2.0"\nhomepage = "${homepage}"\nrepository = "${repository}"\n# Files this repository needs and the crate does not: Nx's project, the\n# generator's records, the smoke test (scripts/test.ts runs it).\nexclude = ["project.json", ".openapi-generator", ".openapi-generator-ignore", ".gitignore", "examples/smoke.rs"]\n`,
    ],
    // The smoke test's runtime, which users of the crate bring their own of.
    [
      "\n[features]\n",
      '\n[dev-dependencies]\ntokio = { version = "1", features = ["macros", "rt-multi-thread"] }\n\n[features]\n',
    ],
  ]);
};

/**
 * Packagist reads each version from the mirror's tags, and asks that
 * composer.json carry none of its own.
 */
const php = async (language: Language, folder: string): Promise<void> => {
  await replaceIn(path.join(folder, "composer.json"), [
    [`    "version": "${language.version}",\n`, ""],
  ]);
};

type Finisher = (language: Language, folder: string) => Promise<void>;

const finishers = {
  dotnet,
  go: undefined,
  java,
  node,
  php,
  python,
  ruby,
  rust,
} satisfies Readonly<Record<LanguageName, Finisher | undefined>>;

export const finish = async (
  language: Language,
  folder: string
): Promise<void> => {
  await finishers[language.name]?.(language, folder);
};
