// The SDKs: one folder, Nx project (peal-sdk-<name>) and registry package per
// language, generated from openapi.json by openapi-generator. A language's
// version is its package's: bump it here to release it. Every image is pinned
// by digest, as the compose stack's are.

/** openapi-generator, which writes every SDK. */
export const generatorImage =
  "openapitools/openapi-generator-cli:v7.27.0@sha256:949efd0d5cf3c093ef169887b2ebe0879ee2e8074b6476264232ce4fd8ef46d0";

export const repository = "https://github.com/peal-social/peal";
export const homepage = "https://peal.social";
export const contactEmail = "hello@peal.social";

export const description =
  "Client for the Peal API: schedule social media posts across platforms.";

/** A build that runs in an image, as the calling user, in the language's folder. */
interface ContainerBuild {
  readonly environment: Readonly<Record<string, string>>;
  readonly image: string;
  readonly kind: "container";
  readonly script: string;
}

/** A build that runs on this machine, with the workspace's own tools. */
interface HostBuild {
  readonly kind: "host";
  readonly script: string;
}

export type LanguageName =
  | "dotnet"
  | "go"
  | "java"
  | "node"
  | "php"
  | "python"
  | "ruby"
  | "rust";

export interface Language {
  readonly build: ContainerBuild | HostBuild;
  /** openapi-generator's generator. */
  readonly generator: string;
  /** The path under github.com/peal-social that READMEs and Go's module name. */
  readonly gitRepoId: string;
  readonly library?: string;
  /** The folder under packages/peal-sdk. */
  readonly name: LanguageName;
  /** The generator's options for this language (`config-help -g <generator>`). */
  readonly options: Readonly<Record<string, string | boolean>>;
  /** What developers install: the registry and the package's name there. */
  readonly package: { readonly name: string; readonly registry: string };
  /**
   * The smoke test, run like the build (same image, same folder) by
   * scripts/test.ts, with PEAL_API_URL pointing at its stand-in server.
   */
  readonly test: string;
  readonly version: string;
}

const python = "0.2.0";
const node = "0.2.0";
const go = "0.2.0";
const ruby = "0.2.0";
const java = "0.2.0";
const php = "0.2.0";
const dotnet = "0.2.0";
const rust = "0.2.0";

export const languages: readonly Language[] = [
  {
    build: {
      kind: "host",
      // The workspace's TypeScript compiles the ES modules npm ships.
      script:
        "rm -rf dist && \"$TSC\" -p tsconfig.json && node --input-type=module -e \"const sdk = await import('./dist/index.js'); if (typeof sdk.SystemApi !== 'function') { throw new Error('SystemApi is missing'); }\"",
    },
    generator: "typescript-fetch",
    gitRepoId: "peal",
    name: "node",
    options: {
      hideGenerationTimestamp: true,
      importFileExtension: ".js",
      // npm refuses `peal` as too close to other packages' names.
      npmName: "peal-sdk",
      npmVersion: node,
      supportsES6: true,
    },
    package: { name: "peal-sdk", registry: "npm" },
    test: "node test/smoke.mjs",
    version: node,
  },
  {
    build: {
      kind: "host",
      script: `rm -rf dist && uv build --quiet --out-dir dist && uv run --quiet --isolated --no-project --with "$(ls dist/*.whl)" python -c "import peal; assert peal.__version__ == '${
        python
      }'"`,
    },
    generator: "python",
    gitRepoId: "peal",
    name: "python",
    options: {
      hideGenerationTimestamp: true,
      packageName: "peal",
      packageUrl: `${repository}/tree/main/packages/peal-sdk/python`,
      packageVersion: python,
      projectName: "peal-sdk",
    },
    package: { name: "peal-sdk", registry: "PyPI" },
    test: 'uv run --quiet --isolated --no-project --with "$(ls dist/*.whl)" python tests/smoke_test.py',
    version: python,
  },
  {
    build: {
      environment: {
        GOCACHE: "/cache/go/build",
        GOFLAGS: "-modcacherw",
        GOMODCACHE: "/cache/go/mod",
        GOTOOLCHAIN: "local",
      },
      image:
        "golang:1.27.3-alpine@sha256:fa3d596898d9f126af7c01d14ee7597bab3f39cccf392ef36b69fe77cd681f18",
      kind: "container",
      script: "go build ./... && go vet ./...",
    },
    generator: "go",
    // Go names a module after where its source lives.
    gitRepoId: "peal/packages/peal-sdk/go",
    name: "go",
    options: {
      enumClassPrefix: true,
      hideGenerationTimestamp: true,
      isGoSubmodule: false,
      packageName: "peal",
      packageVersion: go,
    },
    package: {
      name: "github.com/peal-social/peal/packages/peal-sdk/go",
      registry: "Go",
    },
    test: "go test -count=1 -run TestSmoke .",
    version: go,
  },
  {
    build: {
      // The Gemfile's development tools need a C compiler, and building the gem
      // needs none of them.
      environment: {
        BUNDLE_PATH: "/cache/bundle",
        BUNDLE_WITHOUT: "development:test",
      },
      // The full image, with a C compiler: Faraday's json gem builds an extension.
      image:
        "ruby:4.0.9@sha256:07042b74555ff2eef7365abd72d39cba6e499ab63e2d2942fd34d4778338495b",
      kind: "container",
      // The gemspec packs every file it finds, so the gem is built before
      // dist/ holds anything.
      script: `rm -rf dist && bundle install --quiet && gem build --silent peal.gemspec && mkdir dist && mv peal-${ruby}.gem dist/ && bundle exec ruby -Ilib -e 'require "peal"; abort("wrong version") unless Peal::VERSION == "${ruby}"'`,
    },
    generator: "ruby",
    gitRepoId: "peal",
    // Faraday is pure Ruby: the default, Typhoeus, needs the system's libcurl.
    library: "faraday",
    name: "ruby",
    options: {
      gemAuthor: "Peal",
      gemAuthorEmail: contactEmail,
      gemDescription: description,
      gemHomepage: homepage,
      gemLicense: "Apache-2.0",
      gemName: "peal",
      gemSummary: description,
      gemVersion: ruby,
      hideGenerationTimestamp: true,
      moduleName: "Peal",
    },
    package: { name: "peal", registry: "RubyGems" },
    test: "bundle exec ruby -Ilib smoke.rb",
    version: ruby,
  },
  {
    build: {
      environment: {},
      image:
        "maven:3.10.0-eclipse-temurin-25@sha256:047a82fc82c613266cfb1b66fd920be9c8ba51fd67edc68245e4542768f45e36",
      kind: "container",
      script:
        "mvn --batch-mode --quiet -Dmaven.repo.local=/cache/m2 -DskipTests package",
    },
    generator: "java",
    gitRepoId: "peal",
    // OkHttp with Gson, the generator's default, sends the bearer token its docs
    // show (HttpBearerAuth); its `native` library has no authentication.
    library: "okhttp-gson",
    name: "java",
    options: {
      apiPackage: "social.peal.api",
      artifactDescription: description,
      artifactId: "peal",
      artifactUrl: homepage,
      artifactVersion: java,
      developerEmail: contactEmail,
      developerName: "Peal",
      developerOrganization: "Peal",
      developerOrganizationUrl: homepage,
      groupId: "social.peal",
      hideGenerationTimestamp: true,
      invokerPackage: "social.peal",
      licenseName: "Apache-2.0",
      licenseUrl: "https://www.apache.org/licenses/LICENSE-2.0.txt",
      modelPackage: "social.peal.model",
      scmConnection: `scm:git:${repository}.git`,
      scmDeveloperConnection: `scm:git:${repository}.git`,
      scmUrl: repository,
    },
    package: { name: "social.peal:peal", registry: "Maven Central" },
    test: "mvn --batch-mode --quiet -Dmaven.repo.local=/cache/m2 -Dtest=SmokeTest -Dsurefire.failIfNoSpecifiedTests=false test",
    version: java,
  },
  {
    build: {
      environment: { COMPOSER_HOME: "/cache/composer" },
      image:
        "composer:2.11.1@sha256:8de2184c6de224f4689e8f80ed5f5edaf0030b6b8b7839a22a2bcb6722ac87d0",
      kind: "container",
      script:
        "composer validate --no-check-publish --no-check-lock --strict --quiet && composer update --no-interaction --no-progress --quiet && find lib -name '*.php' -print0 | xargs -0 -n 1 php --syntax-check > /dev/null && php -r 'require \"vendor/autoload.php\"; exit(class_exists(\"Peal\\\\Api\\\\SystemApi\") ? 0 : 1);'",
    },
    generator: "php",
    gitRepoId: "peal",
    name: "php",
    options: {
      artifactUrl: homepage,
      artifactVersion: php,
      composerPackageName: "peal-social/peal",
      developerOrganization: "Peal",
      developerOrganizationUrl: homepage,
      hideGenerationTimestamp: true,
      invokerPackage: "Peal",
      licenseName: "Apache-2.0",
    },
    package: { name: "peal-social/peal", registry: "Packagist" },
    test: "php smoke.php",
    version: php,
  },
  {
    build: {
      environment: {
        DOTNET_CLI_TELEMETRY_OPTOUT: "1",
        DOTNET_NOLOGO: "1",
        NUGET_PACKAGES: "/cache/nuget",
      },
      image:
        "mcr.microsoft.com/dotnet/sdk:10.0.403@sha256:212fe4cb74627d5adf9817a4088906ae3edff1bd853bb27565d4b46731efe61e",
      kind: "container",
      script:
        "dotnet pack src/Peal/Peal.csproj --configuration Release --output dist --nologo --verbosity quiet",
    },
    generator: "csharp",
    gitRepoId: "peal",
    name: "dotnet",
    options: {
      hideGenerationTimestamp: true,
      licenseId: "Apache-2.0",
      nullableReferenceTypes: true,
      // Fixed, or the generator makes up a new one on every run.
      packageGuid: "{9D55A421-FCE8-44D9-9F93-A157BC7E7872}",
      packageName: "Peal",
      packageTags: "peal;social-media;scheduling;api",
      packageVersion: dotnet,
      targetFramework: "net10.0",
    },
    package: { name: "Peal", registry: "NuGet" },
    test: "dotnet run --project smoke/Smoke.csproj --nologo --verbosity quiet",
    version: dotnet,
  },
  {
    build: {
      environment: { CARGO_HOME: "/cache/cargo" },
      image:
        "rust:1.99.1-slim@sha256:f6c4a35d21dbb3c89d7a8d056c193e94fc09037f2b58dd858b09c39a47dd02d7",
      kind: "container",
      script:
        "cargo build --quiet && cargo package --quiet --allow-dirty --no-verify",
    },
    generator: "rust",
    gitRepoId: "peal",
    name: "rust",
    options: {
      hideGenerationTimestamp: true,
      packageName: "peal-sdk",
      packageVersion: rust,
      // rustls, so nobody needs OpenSSL to build the crate.
      reqwestDefaultFeatures: "rustls",
    },
    package: { name: "peal-sdk", registry: "crates.io" },
    test: "cargo run --quiet --example smoke",
    version: rust,
  },
];

export const languageNamed = (name: string | undefined): Language => {
  const language = languages.find((candidate) => candidate.name === name);

  if (language === undefined) {
    throw new Error(
      `Name a language: ${languages.map((candidate) => candidate.name).join(", ")}`
    );
  }

  return language;
};
