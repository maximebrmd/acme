// The SDKs: one folder, Nx project (peal-sdk-<name>) and registry package per
// language, generated from openapi.json by Fern's generator for the language.
// A language's version is its package's: bump it here to release it. Every
// image is pinned by digest, as the compose stack's are.
import type { Schema } from "effect";

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

/**
 * A Fern generator: scripts/generate.ts runs the image the digest pins, under
 * the name and version Fern asks Docker for.
 */
interface Generator {
  /** Its options, generators.yml's `config` (Fern's docs list each language's). */
  readonly config: Schema.JsonObject;
  readonly digest: string;
  readonly image: string;
  readonly version: string;
}

export interface Language {
  readonly build: ContainerBuild | HostBuild;
  readonly generator: Generator;
  /** The folder under packages/peal-sdk. */
  readonly name: LanguageName;
  /** What developers install: the registry and the package's name there. */
  readonly package: { readonly name: string; readonly registry: string };
  /**
   * The smoke test, run like the build (same image, same folder) by
   * scripts/test.ts, with PEAL_API_URL pointing at its stand-in server.
   */
  readonly test: string;
  readonly version: string;
}

const python = "0.3.0";
const node = "0.3.0";
const go = "0.3.0";
const ruby = "0.3.0";
const java = "0.3.0";
const php = "0.3.0";
const dotnet = "0.3.0";
const rust = "0.3.0";

/** Where the SDKs' source lives, for the manifests that link to it. */
export const sourceUrl = (language: LanguageName): string =>
  `${repository}/tree/main/packages/peal-sdk/${language}`;

export const languages: readonly Language[] = [
  {
    build: {
      environment: { npm_config_cache: "/cache/npm" },
      image:
        "node:26.13.0-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216",
      kind: "container",
      // The TypeScript and Node types the package.json names, at one version
      // each, compile the CommonJS and ES modules npm ships, as the package's
      // own build script would with pnpm.
      script:
        "rm -rf dist && npm install --silent --no-save --no-package-lock --prefix /cache/node-tools typescript@5.9.3 @types/node@20.19.43 && for build in cjs esm; do /cache/node-tools/node_modules/.bin/tsc -p tsconfig.$build.json --typeRoots /cache/node-tools/node_modules/@types --types node --extendedDiagnostics false || exit 1; done && node scripts/rename-to-esm-files.js dist/esm && node -e \"if (typeof require('./dist/cjs/index.js').PealClient !== 'function') { throw new Error('PealClient is missing'); }\"",
    },
    generator: {
      config: {
        // Fern's linter and formatter would only add development tools.
        formatter: "none",
        generateWireTests: false,
        linter: "none",
        namespaceExport: "Peal",
        // No X-Fern-* headers on Peal's requests.
        omitFernHeaders: true,
        packageJson: {
          author: `Peal <${contactEmail}>`,
          description,
          homepage,
          license: "Apache-2.0",
          // npm refuses `peal` as too close to other packages' names.
          name: "peal-sdk",
          repository: {
            directory: "packages/peal-sdk/node",
            type: "git",
            url: `git+${repository}.git`,
          },
        },
        writeUnitTests: false,
      },
      digest:
        "sha256:025b8637bd2b1e8f3b6e40a985f45c64bb580ded78926d8930e9d42913f41966",
      image: "fernapi/fern-typescript-sdk",
      version: "3.108.15",
    },
    name: "node",
    package: { name: "peal-sdk", registry: "npm" },
    test: "node test/smoke.mjs",
    version: node,
  },
  {
    build: {
      kind: "host",
      script: `rm -rf dist && uv build --quiet --out-dir dist && uv run --quiet --isolated --no-project --with "$(ls dist/*.whl)" python -c "import peal; from importlib.metadata import version; assert version('peal-sdk') == '${python}'"`,
    },
    generator: {
      config: {
        client: { class_name: "Peal" },
        package_name: "peal",
      },
      digest:
        "sha256:b78aa8836f2d79766c8c2c1ba5f8fa7abf20837ebfdee6a0dfe3f563dc8433a7",
      image: "fernapi/fern-python-sdk",
      version: "5.41.26",
    },
    name: "python",
    package: { name: "peal-sdk", registry: "PyPI" },
    test: 'uv run --quiet --isolated --no-project --with "$(ls dist/*.whl)" python smoke.py',
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
    generator: {
      config: {
        // Go names a module after where its source lives.
        module: { path: "github.com/peal-social/peal/packages/peal-sdk/go" },
        packageName: "peal",
      },
      digest:
        "sha256:9cd760baee12ab2515e4f53c25bba8374fd0e31c4a98e112f43e0f344603ea25",
      image: "fernapi/fern-go-sdk",
      version: "1.70.22",
    },
    name: "go",
    package: {
      name: "github.com/peal-social/peal/packages/peal-sdk/go",
      registry: "Go",
    },
    // Fern's own tests call a WireMock server, which the smoke test has no
    // need of.
    test: "go test -count=1 -run TestSmoke .",
    version: go,
  },
  {
    build: {
      environment: {},
      image:
        "ruby:4.0.9@sha256:07042b74555ff2eef7365abd72d39cba6e499ab63e2d2942fd34d4778338495b",
      kind: "container",
      // custom.gemspec.rb lists the gem's files, so dist/ can wait.
      script: `rm -rf dist && gem build --silent peal.gemspec && mkdir dist && mv peal-${ruby}.gem dist/ && ruby -Ilib -e 'require "peal"; abort("wrong version") unless Peal::VERSION == "${ruby}"'`,
    },
    generator: {
      // The gem, its folder and its module take the organization's name:
      // `peal`, lib/peal.rb, Peal.
      config: {},
      digest:
        "sha256:dac31ba390287148731bbd5076605b2c2f45db2aa94f93aa4846bbb1bb936ead",
      image: "fernapi/fern-ruby-sdk",
      version: "1.41.3",
    },
    name: "ruby",
    package: { name: "peal", registry: "RubyGems" },
    test: "ruby -Ilib smoke.rb",
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
    generator: {
      config: {
        "client-class-name": "PealClient",
        "package-prefix": "social.peal",
      },
      digest:
        "sha256:5b7d1aadb2919a017b149262e7ee408b1b7ed543a8f28ffe61a83f1ede347a60",
      image: "fernapi/fern-java-sdk",
      version: "4.37.11",
    },
    name: "java",
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
        "composer validate --no-check-publish --no-check-lock --strict --quiet && composer update --no-interaction --no-progress --quiet && find src -name '*.php' -print0 | xargs -0 -n 1 php --syntax-check > /dev/null && php -r 'require \"vendor/autoload.php\"; exit(class_exists(\"Peal\\\\PealClient\") ? 0 : 1);'",
    },
    generator: {
      config: {
        clientName: "PealClient",
        namespace: "Peal",
        packageName: "peal-social/peal",
      },
      digest:
        "sha256:1cb277c2d847d0eb226993a9d2836b5db4cc8a13efd75ad6730ff4971d4705a8",
      image: "fernapi/fern-php-sdk",
      version: "2.30.18",
    },
    name: "php",
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
    generator: {
      config: {
        "client-class-name": "PealClient",
        namespace: "Peal",
        "package-id": "Peal",
      },
      digest:
        "sha256:382b1dbd6fd6663c074b43d27bce8224fbab3c5023f00d1ae98ce23aed14be87",
      image: "fernapi/fern-csharp-sdk",
      version: "2.92.17",
    },
    name: "dotnet",
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
    generator: {
      config: {
        clientClassName: "PealClient",
        crateName: "peal-sdk",
        packageDescription: description,
        packageDocumentation: "https://docs.rs/peal-sdk",
        packageLicense: "Apache-2.0",
        packageRepository: repository,
        // crates.io names the crate peal-sdk, and the code imports peal_sdk.
        preserveCrateNameHyphens: true,
      },
      digest:
        "sha256:6ad85636c2529e2b3998190113b7bd769af74a0658b0d1d56bc1466e8641ed13",
      image: "fernapi/fern-rust-sdk",
      version: "0.53.6",
    },
    name: "rust",
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
