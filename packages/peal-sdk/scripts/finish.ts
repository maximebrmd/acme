// What Fern's generators leave out of each package's manifest, or put in the
// folder that the package does not ship: the names, license and links the
// configuration cannot set, Fern's badge in the READMEs, and Java's Gradle
// build, which Maven's replaces. Each replacement checks it found its text,
// so a generator upgrade that changes its output stops the run here rather
// than shipping it unfinished.
import { rm } from "node:fs/promises";
import path from "node:path";

import { Schema } from "effect";

import {
  contactEmail,
  description,
  homepage,
  repository,
  sourceUrl,
} from "./languages.ts";
import type { Language, LanguageName } from "./languages.ts";

const decodeManifest = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.JsonObject)
);

const isStringArray = Schema.is(Schema.Array(Schema.String));

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

const writeManifest = async (
  file: string,
  manifest: Schema.JsonObject
): Promise<void> => {
  await Bun.write(file, `${JSON.stringify(manifest, null, 2)}\n`);
};

/** Fern's badge, which some READMEs open with: the READMEs are Peal's. */
const fernBadge = /^\[!\[fern shield\]\([^)]*\)\]\([^)]*\)\n/mu;

const removeBadge = async (folder: string): Promise<void> => {
  const file = path.join(folder, "README.md");
  const readme = await Bun.file(file).text();

  await Bun.write(file, readme.replace(fernBadge, ""));
};

/** An Installation section, for the READMEs Fern writes without one. */
const addInstallation = async (
  folder: string,
  instructions: string
): Promise<void> => {
  await replaceIn(path.join(folder, "README.md"), [
    [
      "\n## Reference\n",
      `\n## Installation\n\n${instructions}\n\n## Reference\n`,
    ],
  ]);
};

/**
 * npm ships what `files` lists: the notice too. Nx would make a target of
 * each script Fern writes (`test`, `build`: vitest and pnpm, which nothing
 * installs here), and `includedScripts` keeps them out: sdk:build builds it.
 */
const node = async (_language: Language, folder: string): Promise<void> => {
  const file = path.join(folder, "package.json");
  const manifest = decodeManifest(await Bun.file(file).text());
  const { files } = manifest;

  if (!isStringArray(files) || !files.includes("LICENSE")) {
    throw new Error("package.json no longer lists LICENSE in its files");
  }

  await writeManifest(file, {
    ...manifest,
    files: files.flatMap((name) =>
      name === "LICENSE" ? [name, "NOTICE"] : [name]
    ),
    nx: { includedScripts: [] },
  });
};

/**
 * The distribution on PyPI is peal-sdk; the import package stays peal.
 * Poetry ships LICENSE and NOTICE as license files of its own accord.
 */
const python = async (language: Language, folder: string): Promise<void> => {
  await replaceIn(path.join(folder, "README.md"), [
    [
      "[![pypi](https://img.shields.io/pypi/v/peal)](https://pypi.python.org/pypi/peal)",
      "[![pypi](https://img.shields.io/pypi/v/peal-sdk)](https://pypi.org/project/peal-sdk/)",
    ],
    ["pip install peal\n", "pip install peal-sdk\n"],
  ]);
  await replaceIn(path.join(folder, "pyproject.toml"), [
    ['[project]\nname = "peal"\n', '[project]\nname = "peal-sdk"\n'],
    ['[tool.poetry]\nname = "peal"\n', '[tool.poetry]\nname = "peal-sdk"\n'],
    ['description = ""\n', `description = "${description}"\n`],
    [
      "authors = []\n",
      `authors = ["Peal <${contactEmail}>"]\nlicense = "Apache-2.0"\nhomepage = "${homepage}"\nrepository = "${sourceUrl(language.name)}"\n`,
    ],
    [
      "keywords = []\n",
      'keywords = ["peal", "social media", "scheduling", "api", "sdk"]\n',
    ],
  ]);
};

/**
 * A Gradle dependency as Maven declares it: `api` and `implementation` ship
 * with the library, `testImplementation` only builds its tests.
 */
const gradleDependency =
  /^ {4}(?<configuration>api|implementation|testImplementation) '(?<group>[^:']+):(?<artifact>[^:']+):(?<version>[^']+)'$/gmu;

/**
 * OkHttp 5 is a Kotlin Multiplatform library: Gradle finds its JVM build
 * through `okhttp`, and Maven needs to name it, `okhttp-jvm`.
 */
const mavenArtifact = (
  group: string | undefined,
  artifact: string | undefined
): string | undefined =>
  group === "com.squareup.okhttp3" && artifact === "okhttp"
    ? "okhttp-jvm"
    : artifact;

/**
 * The release each group's artifacts take at least. Maven takes the version
 * a pom names, not a range, so the SDK's users get the generator's unless
 * they override it: a generator that names a release with known
 * vulnerabilities gets this one in its place. Jackson's modules go together,
 * on its latest 2.18 patch (2.18.6, the generator's, has advisories fixed in
 * 2.18.11). A generator that names a later release keeps it.
 */
const minimumVersions: ReadonlyMap<string, string> = new Map([
  ["com.fasterxml.jackson.core", "2.18.12"],
  ["com.fasterxml.jackson.datatype", "2.18.12"],
]);

/** Compares dotted numeric versions (2.18.6 before 2.18.12). */
const isBefore = (version: string, minimum: string): boolean => {
  const parts = version.split(".").map(Number);
  const minimumParts = minimum.split(".").map(Number);

  if ([...parts, ...minimumParts].some(Number.isNaN)) {
    throw new Error(`Cannot compare the versions ${version} and ${minimum}`);
  }

  for (const [index, minimumPart] of minimumParts.entries()) {
    const part = parts[index] ?? 0;

    if (part !== minimumPart) {
      return part < minimumPart;
    }
  }

  return false;
};

const mavenVersion = (
  group: string | undefined,
  version: string | undefined
): string | undefined => {
  const minimum = group === undefined ? undefined : minimumVersions.get(group);

  return minimum !== undefined &&
    version !== undefined &&
    isBefore(version, minimum)
    ? minimum
    : version;
};

const mavenDependencies = (gradleBuild: string): string => {
  const dependencies = [...gradleBuild.matchAll(gradleDependency)].map(
    ({ groups: { artifact, configuration, group, version } = {} }) =>
      `        <dependency>
            <groupId>${group}</groupId>
            <artifactId>${mavenArtifact(group, artifact)}</artifactId>
            <version>${mavenVersion(group, version)}</version>${configuration === "testImplementation" ? "\n            <scope>test</scope>" : ""}
        </dependency>`
  );

  if (dependencies.length === 0) {
    throw new Error(
      "build.gradle no longer lists dependencies as Maven can read them"
    );
  }

  return dependencies.join("\n");
};

/** Gradle's `sourceCompatibility = 1.8`, as javac's --release takes it (8). */
const javaRelease = (gradleBuild: string): string => {
  const release = /^sourceCompatibility = (?:1\.)?(?<release>\d+)$/mu.exec(
    gradleBuild
  )?.groups?.["release"];

  if (release === undefined) {
    throw new Error("build.gradle no longer sets sourceCompatibility");
  }

  return release;
};

/**
 * Maven builds and releases the Java SDK, from the dependencies Fern's
 * Gradle build declares: Maven Central takes signed artifacts through its
 * portal, which the `release` profile reaches with Sonatype's plugin,
 * signing with BouncyCastle (no gpg binary: the key and its passphrase come
 * from MAVEN_GPG_KEY and MAVEN_GPG_PASSPHRASE). The Gradle files go, with
 * what the generator's own Gradle run left behind.
 */
const java = async (language: Language, folder: string): Promise<void> => {
  const gradleBuild = await Bun.file(path.join(folder, "build.gradle")).text();

  await addInstallation(
    folder,
    `With Maven:

\`\`\`xml
<dependency>
    <groupId>social.peal</groupId>
    <artifactId>peal</artifactId>
    <version>${language.version}</version>
</dependency>
\`\`\`

With Gradle:

\`\`\`groovy
implementation 'social.peal:peal:${language.version}'
\`\`\``
  );

  await Bun.write(
    path.join(folder, "pom.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<!-- Written by scripts/finish.ts, with build.gradle's dependencies. -->
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>social.peal</groupId>
    <artifactId>peal</artifactId>
    <version>${language.version}</version>
    <packaging>jar</packaging>
    <name>Peal</name>
    <description>${description}</description>
    <url>${homepage}</url>
    <licenses>
        <license>
            <name>Apache-2.0</name>
            <url>https://www.apache.org/licenses/LICENSE-2.0.txt</url>
            <distribution>repo</distribution>
        </license>
    </licenses>
    <developers>
        <developer>
            <name>Peal</name>
            <email>${contactEmail}</email>
            <organization>Peal</organization>
            <organizationUrl>${homepage}</organizationUrl>
        </developer>
    </developers>
    <scm>
        <connection>scm:git:${repository}.git</connection>
        <developerConnection>scm:git:${repository}.git</developerConnection>
        <url>${sourceUrl(language.name)}</url>
    </scm>
    <properties>
        <maven.compiler.release>${javaRelease(gradleBuild)}</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
    <dependencies>
${mavenDependencies(gradleBuild)}
    </dependencies>
    <build>
        <resources>
            <resource>
                <directory>src/main/resources</directory>
            </resource>
            <!-- The license and the notice, in the jar's META-INF as Apache's own jars carry them. -->
            <resource>
                <directory>.</directory>
                <targetPath>META-INF</targetPath>
                <includes>
                    <include>LICENSE</include>
                    <include>NOTICE</include>
                </includes>
            </resource>
        </resources>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.14.1</version>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.5.4</version>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-source-plugin</artifactId>
                <version>3.3.1</version>
                <executions>
                    <execution>
                        <id>attach-sources</id>
                        <goals>
                            <goal>jar-no-fork</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-javadoc-plugin</artifactId>
                <version>3.12.0</version>
                <configuration>
                    <doclint>none</doclint>
                    <quiet>true</quiet>
                </configuration>
                <executions>
                    <execution>
                        <id>attach-javadocs</id>
                        <goals>
                            <goal>jar</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
    <profiles>
        <profile>
            <id>release</id>
            <build>
                <plugins>
                    <plugin>
                        <groupId>org.apache.maven.plugins</groupId>
                        <artifactId>maven-gpg-plugin</artifactId>
                        <version>3.2.8</version>
                        <configuration>
                            <signer>bc</signer>
                        </configuration>
                        <executions>
                            <execution>
                                <id>sign-artifacts</id>
                                <phase>verify</phase>
                                <goals>
                                    <goal>sign</goal>
                                </goals>
                            </execution>
                        </executions>
                    </plugin>
                    <plugin>
                        <groupId>org.sonatype.central</groupId>
                        <artifactId>central-publishing-maven-plugin</artifactId>
                        <version>0.12.0</version>
                        <extensions>true</extensions>
                        <configuration>
                            <publishingServerId>central</publishingServerId>
                            <autoPublish>true</autoPublish>
                            <waitUntil>published</waitUntil>
                        </configuration>
                    </plugin>
                </plugins>
            </build>
        </profile>
    </profiles>
</project>
`
  );

  await Promise.all(
    [
      ".gradle",
      "build",
      "build.gradle",
      "gradle",
      "gradlew",
      "gradlew.bat",
      "sample-app",
      "settings.gradle",
    ].map(async (name) => {
      await rm(path.join(folder, name), { force: true, recursive: true });
    })
  );
};

/** Composer takes a version from the tag, and the license and links from here. */
const php = async (_language: Language, folder: string): Promise<void> => {
  const file = path.join(folder, "composer.json");

  const { version: _version, ...manifest } = decodeManifest(
    await Bun.file(file).text()
  );

  // A version in composer.json would contradict the tags Packagist reads.
  await writeManifest(file, {
    ...manifest,
    authors: [{ email: contactEmail, homepage, name: "Peal" }],
    description,
    homepage,
    license: "Apache-2.0",
    support: { issues: `${repository}/issues`, source: repository },
  });
};

/**
 * reqwest without its default features has no TLS, and Peal's API is HTTPS:
 * rustls, so nobody needs OpenSSL to build the crate. The crate leaves out
 * what only this repository needs.
 */
const rust = async (_language: Language, folder: string): Promise<void> => {
  await replaceIn(path.join(folder, "Cargo.toml"), [
    [
      'reqwest = { version = "0.12", features = ["json", "stream", "gzip"], default-features = false }',
      'reqwest = { version = "0.12", features = ["json", "stream", "gzip", "rustls-tls"], default-features = false }',
    ],
    [
      'documentation = "https://docs.rs/peal-sdk"\n',
      `documentation = "https://docs.rs/peal-sdk"\nhomepage = "${homepage}"\nauthors = ["Peal <${contactEmail}>"]\nkeywords = ["peal", "social-media", "scheduling", "api", "sdk"]\n# Files this repository needs and the crate does not: Nx's project, Fern's\n# records, the smoke test (scripts/test.ts runs it).\nexclude = ["project.json", ".fern", ".fernignore", "examples/smoke.rs"]\n`,
    ],
  ]);
};

const go = async (language: Language, folder: string): Promise<void> => {
  await addInstallation(
    folder,
    `\`\`\`sh\ngo get github.com/peal-social/peal/packages/peal-sdk/go@v${language.version}\n\`\`\``
  );
};

const ruby = async (_language: Language, folder: string): Promise<void> => {
  await addInstallation(folder, "```sh\ngem install peal\n```");
};

/**
 * Fern's record of what wrote the folder, without what changes from one run
 * to the next (the repository's commit, whether it was clean, who ran Fern):
 * the SDKs regenerate identically, which sdk:check relies on.
 */
const keepStableMetadata = async (folder: string): Promise<void> => {
  const file = path.join(folder, ".fern", "metadata.json");

  const {
    ciProvider: _ciProvider,
    invokedBy: _invokedBy,
    originGitCommit: _originGitCommit,
    originGitCommitIsDirty: _originGitCommitIsDirty,
    ...metadata
  } = decodeManifest(await Bun.file(file).text());

  await writeManifest(file, metadata);
};

type Finisher = (language: Language, folder: string) => Promise<void>;

const finishers = {
  dotnet: undefined,
  go,
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
  // Fern's CI for an SDK in a repository of its own: this repository's
  // workflows build the SDKs, and the PHP mirror, whose root this folder
  // becomes, should run none.
  await rm(path.join(folder, ".github"), { force: true, recursive: true });
  await keepStableMetadata(folder);
  await removeBadge(folder);
  await finishers[language.name]?.(language, folder);
};
