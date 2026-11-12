# Peal

Peal is a social media scheduling platform: teams write posts once, schedule
them across platforms, and see how they perform, at [peal.social](https://peal.social). The
source is public under the Functional Source License (FSL-1.1-ALv2, in
[`LICENSE.md`](LICENSE.md)), with Peal as its licensor: anyone may self-host
it, and each release becomes Apache-2.0 two years after it ships. Call it
"fair source", not open source. The SDKs (`peal-sdk`) are
Apache-2.0, as `peal-contract` is, which they are generated from, each
with its own `LICENSE` and a `NOTICE` (Copyright 2026 Peal): keep anything an SDK user installs or generates from free of FSL
code, so an SDK never depends on another workspace package but the contract.
Every `package.json` names its licence (SPDX), the repository
(https://github.com/peal-social/peal, with its folder), its homepage and where
issues go; README.md's "Licensing" says which part is under which.

Until its rename, the product carried the placeholder name "acme". That name
is gone from the repository and must not come back, in any case or form; the
one `acme` left is Caddy's ACME certificate issuer, a protocol, in the uptime
role's `Caddyfile.j2`.

Nx projects live directly under `packages/`, but for the SDKs, which have one
per language under `packages/peal-sdk/`, and the infrastructure, which has
one per tool under `packages/peal-infra/`:

- `peal-contract`: the HTTP API definition (`Api`: Effect `HttpApi` groups,
  Schemas and the `Authentication` and `WorkspaceAccess` middlewares),
  `OAuthApi` for the Better Auth endpoints Peal's clients call, and
  `peal-contract/post-text`, the text rules clients count with. The server
  implements `Api`; the web app and the CLI derive typed clients from it, and
  the MCP tools reuse its schemas. `nx run peal-contract:openapi` writes
  `openapi.json` for the docs.
- `peal-server`: the Effect server on Bun: the bounded contexts below, Better
  Auth, the MCP endpoint, and the cluster that runs durable jobs and crons.
- `peal-ui`: the design system, shipped as sources that apps compile: shadcn/ui
  on Base UI (Nova style, lucide icons), the Tailwind CSS v4 theme and the
  Geist fonts.
- `peal-web`: the Next.js App Router app, with next-intl, `@effect/atom-react`,
  Better Auth's client and Tiptap.
- `peal-cli`: the `peal` command line, `effect/cli` on Bun, a client of the API
  that signs in with OAuth.
- `peal-docker`: the development compose stack, the production images (the
  server's, with sharp's C++ runtime and a static ffprobe; the web app's;
  the site and docs on nginx; Postgres with pgBackRest), the production stack
  (`compose.production.yaml`) and Caddy in front of it for self-hosters
  (`compose.self-host.yaml`).
- `peal-docs`: the documentation site (Blume), with the API reference rendered
  from the contract's `openapi.json`.
- `peal-site`: the static marketing site (Astro), with the legal pages that
  platforms ask for during app review.
- `peal-skills`: the agent skills, in the Agent Skills format, one folder
  each under `skills/`, Apache-2.0 with a `LICENSE` in each.
- `peal-e2e`: end-to-end browser tests with the e2e runner (`e2e`,
  `@e2e-dev/web`). Each run starts the server and the web app's production
  build itself (`scripts/serve.ts`).
- `peal-infra`: Peal's own infrastructure, one Nx project per tool:
  `pulumi` (`peal-infra-pulumi`) keeps what Peal has at Cloudflare as code,
  and `ansible` (`peal-infra-ansible`) configures Peal's servers, production
  and the sandbox, and releases to them. Python, managed with uv.
- `peal-sdk`: the API's clients in eight languages (`node`, `python`, `go`,
  `ruby`, `java`, `php`, `dotnet`, `rust`), generated from the contract by
  Fern's open-source generators and committed. Each language's folder is an Nx project
  (`peal-sdk-<language>`, tagged `sdk`). Apache-2.0, unlike the rest of the
  repository (see [SDKs](packages/peal-sdk/AGENTS.md)).

Work from the repository root unless a command names another directory.

## Guides

This file holds what applies everywhere. A package's own rules are in its
`AGENTS.md`, and each server context's in its folder under
`packages/peal-server/src/`. Read a package's or a context's guide before
changing its code, its tests included, and each one's when a change crosses
several:

- [`packages/peal-server/AGENTS.md`](packages/peal-server/AGENTS.md): the
  server's architecture, the HTTP API and its middlewares, the cluster, the
  database, and the list of the contexts' guides.
- [`packages/peal-web/AGENTS.md`](packages/peal-web/AGENTS.md): the web front.
- [`packages/peal-contract/AGENTS.md`](packages/peal-contract/AGENTS.md):
  the API contract, and how it may change.
- [`packages/peal-cli/AGENTS.md`](packages/peal-cli/AGENTS.md): the command
  line.
- [`packages/peal-skills/AGENTS.md`](packages/peal-skills/AGENTS.md): the
  agent skills.
- [`packages/peal-sdk/AGENTS.md`](packages/peal-sdk/AGENTS.md): the SDKs.
- [`packages/peal-e2e/AGENTS.md`](packages/peal-e2e/AGENTS.md): the end-to-end
  tests.
- [`packages/peal-docker/AGENTS.md`](packages/peal-docker/AGENTS.md): the
  compose files, telemetry and alerting.
- [`packages/peal-infra/AGENTS.md`](packages/peal-infra/AGENTS.md): the
  infrastructure's layers, and
  [`packages/peal-infra/ansible/AGENTS.md`](packages/peal-infra/ansible/AGENTS.md):
  the servers.

## Work and verify

- Use the Bun version in [`.bun-version`](.bun-version) and the Node version
  in the [CI workflow](.github/workflows/ci.yml). Install with
  `bun install --frozen-lockfile`.
- For code changes, run `bun run check`, `bun run typecheck`, `bun run test`
  and `bun run build`, as CI does. `bun run test` also checks the API
  against the last released one (`nx run peal-sdk:test`: `bun test` on
  `packages/peal-sdk/scripts`, then `scripts/compat.ts`). Fix lint findings without inline
  suppressions; `bun run fix` applies what it can. `bun run test` needs the
  development stack's Postgres, Mailpit and SeaweedFS (see
  [Development stack](#development-stack)). It does not run the end-to-end
  tests: run `nx run peal-e2e:e2e` too when a change touches the pages they
  visit (see [End-to-end tests](packages/peal-e2e/AGENTS.md)).
- Linters and formatters are as strict as they go: Ultracite's oxlint presets
  (core and anti-slop everywhere, plus the preset for each package's framework)
  with type-aware rules, and oxfmt. Each package has its own
  `oxlint.config.ts`. Parse values with Effect Schema rather than asserting
  types or checking `typeof`.
- Effect's language service (`@effect/tsgo`) checks Effect code in `tsc`:
  the root `prepare` and `bun run typecheck` patch the workspace's
  TypeScript, and its errors and warnings fail typecheck. Its plugin and
  options are in `tsconfig.base.json` (a package that sets `plugins` lists
  it again); an unstable or experimental Effect module the code starts to
  use joins `allowedUnstableApis` or `allowedExperimentalApis` there. A
  guard that fails is `return yield*` when every path returns a value, and
  otherwise `yield* ok ? Effect.void : Effect.fail(error)`, so
  `consistent-return` holds too.
- Type-aware lint reads generated types, so a package with a generator
  (`next typegen`, `astro sync`) gets a `typegen` target: `bun run check` runs
  every `typegen` first, and the package's `typecheck` depends on it.
- A schema and its type cannot share a name: name a non-class schema `XSchema`,
  with `export type X = typeof XSchema.Type`. Entities and value objects are
  `Schema.Class`, which is both.
- One class per file: give each error its own file, named after the class.
- Write `x.pipe(Effect.map(f))`, not `Effect.map(x, f)`, which
  `unicorn/no-array-method-this-argument` mistakes for an array `thisArg`.
- Tests run under vitest on Node, so code under test cannot use `Bun.*`. Inside
  `it.effect`, assert with `assert` from `@effect/vitest` (the lint rules
  report `expect` there as outside a test); in plain `it`, use `expect`.
- `layer(...)` from `@effect/vitest` builds its layers once for the block, and
  `Layer.fresh` rebuilds only the outer layer: a test that needs a layer
  configured differently (a probe without ffprobe, a store that answers
  nothing) goes in a `layer(...)` block of its own.
- Server test helpers shared between folders import through `#test/*`
  (`test/<context>/support.ts`); production code never does, which the lint
  rules refuse.
- `bun build --compile` leaves a `.<hash>.bun-build` copy of Bun (about 90 MB)
  in the working directory when Bun is read-only, as Homebrew installs it.
  Compile through a script that deletes it, like
  `packages/peal-cli/scripts/build.ts`.
- Pin every dependency to the exact latest release, and commit `bun.lock` with
  dependency changes, `packages/peal-infra/ansible/uv.lock` with Python ones. The
  SDKs' manifests are the exception (see [SDKs](packages/peal-sdk/AGENTS.md)).
- A change to the contract regenerates the SDKs in the same change:
  `bun run sdk:generate` (Docker), then `bun run sdk:build`. CI's `sdks` job
  fails while they are stale.
- `bun run test` also runs ansible-lint (production profile),
  `ansible-playbook --syntax-check` and the pytest suite in `tests/` on
  `packages/peal-infra/ansible`, through uv (`nx run peal-infra-ansible:test`). Its release
  and uptime tests run images in Docker (Postgres's base image, Gatus, Caddy,
  BusyBox), and skip without Docker. Each of its commands reads stdin from
  `/dev/null`: Nx gives every task the same stdin, a Node task reading it
  makes it non-blocking for all of them while it runs, and Ansible then
  refuses to start ("requires blocking IO"), which ansible-lint reports as
  "Unable to find a working copy of ansible executable".
- Define Nx target defaults in [`nx.json`](nx.json) and package targets in
  `project.json`. Declare build dependencies and cache outputs there. Keep
  tests uncached.

## Read the sources, not memory

Effect 4, Drizzle 1.0, Better Auth, the AT Protocol OAuth client, Tiptap, Blume
and Astro move faster than any training data. `bun run references` clones each
one's source, at the version this workspace installs, into
`.local/references/<name>` (ignored by Git, Nx and the linters). Read the code,
tests and docs there before using an API, and rerun the command after an
upgrade. Effect also ships agent docs in `.local/references/effect/ai-docs`,
and Next.js ships its docs in `packages/peal-web/node_modules/next/dist/docs`.

## Development stack

- Start Postgres, the S3 store (SeaweedFS), Mailpit and the telemetry stack
  with `bun nx run peal-docker:up`, which waits until every service is healthy.
  Stop it with `bun nx run peal-docker:down` (`-- --volumes` also deletes the
  data). The [contributing guide](.github/CONTRIBUTING.md) lists the ports.
- Outside production, the server defaults every outside service to this stack:
  `PEAL_S3_*` to SeaweedFS, `SMTP_URL` to Mailpit, `PUBLIC_URL` to
  `http://localhost:3001`. Only `DATABASE_URL` has no default.
- Browsers upload media straight to the bucket: run
  `bun nx run peal-server:media-cors` once per bucket. It puts the upload CORS
  rule on the bucket `PEAL_S3_*` names, for `PUBLIC_URL` and
  `TRUSTED_ORIGINS`, keeps the bucket's other rules, and changes nothing when
  run again.
- Server tests run against the Postgres that `DATABASE_URL` names, and write to
  it. With the stack up, use
  `DATABASE_URL=postgres://peal:peal@127.0.0.1:15432/peal`. They read the
  emails they send from the stack's Mailpit (`SMTP_URL` and `MAILPIT_URL`
  override it), store media in its SeaweedFS under `tests/media/`
  (`PEAL_S3_*` override it), and call its stripe-mock (`STRIPE_MOCK_URL`
  overrides it). CI runs its own Postgres, Mailpit and stripe-mock, pinned
  by digest, and starts SeaweedFS from `compose.yaml`.
- Tests that share a database with a running dev server share its jobs: leave
  no post scheduled or job waiting when a test ends, or the dev server runs
  it. Give each run its own database or `PEAL_S3_KEY_PREFIX` when several run
  at once.
- To run a second stack beside another, set `COMPOSE_PROJECT_NAME` and the
  `PEAL_*_PORT` overrides listed in `packages/peal-docker/.env.example`.

## Self-hosting

Every outside service sits behind a port with a self-hostable default, so a
self-hoster needs only Postgres and an S3-compatible store:

- storage: any S3 API (R2 in production, SeaweedFS in development), with the
  upload CORS rule that `media-cors` writes;
- email: Resend or SMTP (Mailpit in development);
- billing: Stripe, off when no key is set (no plan limits);
- ads: off until `PEAL_ADS` is `read` or `spend`, with the operator's own
  Meta app holding the ads permissions (see
  [`src/ads/AGENTS.md`](packages/peal-server/src/ads/AGENTS.md));
- captcha: Turnstile, off when no key is set;
- sign-up: anyone, unless `PEAL_SIGN_UP=invitation` (an invitation's link
  with its address, and the first account only);
- AI: an Anthropic key, or any OpenAI-compatible endpoint that serves
  `/chat/completions`; the writing assistant is off until `PEAL_AI_PROVIDER`
  is set, and its images until `PEAL_AI_IMAGE_PROVIDER` names an
  OpenAI-compatible endpoint that serves `/images/generations`;
- rate limit: `PEAL_API_REQUESTS_PER_MINUTE` per key and per application
  (600), on Postgres;
- documentation links: `PEAL_DOCS_URL`, unset by default, for the links the
  discovery documents give;
- telemetry: OTLP export of logs, metrics and traces only when
  `OTEL_EXPORTER_OTLP_ENDPOINT` is set (`src/app/observability.ts` defaults
  each `OTEL_<SIGNAL>_EXPORTER` to `otlp`; set one to `none` to turn that
  signal off). Traces are head-sampled as `OTEL_TRACES_SAMPLER` and
  `OTEL_TRACES_SAMPLER_ARG` say (`src/app/trace-sampling.ts`): one in ten
  in production, all elsewhere. Whatever the ratio, the spans in
  `alwaysSampledSpans` (each publishing attempt) are sampled, and a span of
  an unsampled trace is still exported when it ended in a defect, when the
  server failed the request (5xx) or when it lasted `slowSpan` (10 s), with
  its parents (`SampledSpan`). Never alert or count on spans, which are a
  sample: count in a metric (`peal.http.requests`, which the request alerts
  read) or a log.

- Images read `PORT` and plain environment variables and run anywhere.
- Self-hosters run `compose.production.yaml` with `compose.self-host.yaml`:
  Caddy (`self-host/Caddyfile`) terminates TLS, routes as below and waits 150
  seconds for an answer. `self-host.env.example` lists what to set.
- Route `/api/*` and `/.well-known/oauth-*` to the server, or let the web app
  forward them, and everything else to the web app.
- Document every setting a package reads in the docs' environment variables
  page, in English and French, in the same change.

## Docs and marketing site

- Docs pages live in `packages/peal-docs/docs/`: English at the root, French in
  `docs/fr/` under the same file names. Pin each heading's anchor with `[#id]`
  so links work in both languages, and order pages with `sidebar.order`: a whole
  number, each used once, the same in both languages (renumber the pages
  after a new one rather than squeeze it in with a fraction).
- Every docs target depends on `peal-contract:openapi`, so the reference
  matches the contract. `nx run peal-docs:test` runs `blume validate --strict`.
- Do not run `blume build` or `blume check` while `blume dev` runs in the same
  package: they share the generated runtime in `.blume/` (typecheck uses
  `--isolated` for that reason). Leave Blume's own TypeScript 6 alone.
- The site's pricing page (`src/pages/[...locale]/pricing.astro`, its
  logic in `src/pricing.ts`) and the docs' **Plans and billing** page
  (`docs/billing.mdx`, with the variables of `pricing-variables.ts`) show
  the contract's catalogue; the legal pages' plans section follows it.
- Site strings live in `packages/peal-site/src/i18n/messages.ts`, legal
  documents in `src/content/legal/<locale>/<document>.md`. Keep a legal
  document `draft: true` (banner and noindex) until legal review approves it,
  and never replace a [bracketed placeholder] with a guess.
- The privacy policy's retention table is the registry's
  (`peal-contract/data-processing`), which `nx run peal-site:test` checks
  in both languages: change the registry, then the table.
- TypeScript 7 does not read `.astro` files, and `astro check` refuses it: keep
  page logic in typed `.ts` modules and `.astro` files thin. Name files in
  kebab-case.
- `nx run peal-docs:build` and `nx run peal-site:build` write each package's
  `dist/`, cached. Their settings are optional, and unset or empty turns the
  feature off: docs `DOCS_SITE_URL`, `DOCS_PLAUSIBLE_DOMAIN`,
  `DOCS_PLAUSIBLE_HOST`; site `SITE_URL`, `SITE_DOCS_URL`, `SITE_APP_URL`
  (the footer's links to the app's contract functions),
  `SITE_PLAUSIBLE_DOMAIN`, `SITE_PLAUSIBLE_HOST`. Nx hashes them from the
  process environment only, not `.env` files: export them, or build with
  `--skip-nx-cache`.
- The site serves `/.well-known/security.txt` (`public/.well-known/`) for
  peal.social, with `security@peal.social`: move its `Expires` a year ahead
  before it passes.
- Run the site with `nx run peal-site:dev`: it sets `ASTRO_DEV_BACKGROUND=0`,
  because Astro otherwise detaches `astro dev` when an agent runs it.

## Environments

- `dev`: local, with the compose stack from `peal-docker`.
- `sandbox`: pre-production, with its own database, R2 bucket, Stripe sandbox
  and platform redirect URIs.
- `production`.

## Infrastructure

The servers' other rules are in
[`packages/peal-infra/ansible/AGENTS.md`](packages/peal-infra/ansible/AGENTS.md).

- Change the servers only through the playbooks in `packages/peal-infra/ansible`; SSH
  is for reading (`sudo peal-compose ps`). Run `site.yml` with `--check
  --diff` before applying it, and keep every task idempotent: a second run
  reports no change. The inventory holds placeholders that `peal_preflight`
  refuses; nothing has been applied yet.
- Secrets are generated on the server and stay there. Do not copy them (the
  one exception, a planned move, is in
  [`packages/peal-infra/AGENTS.md`](packages/peal-infra/AGENTS.md)), print
  them, or give the server's credentials to other systems, GitHub included:
  `release.yml` builds the images on the machine running Ansible and uploads
  them. Credentials outside services issue come from a Git-ignored vault or
  are written on the server, and Ansible checks them by name only.
- Changing a server's size or adding any paid resource needs the owner's
  explicit approval.

## Public repository

- Everything committed is published: synthetic data only in tests and
  fixtures; no secrets, tokens or customer content in source, logs or test
  artifacts.
- A synthetic credential in a test never has the shape of a real one:
  write `sk_test_synthetic_…`, not a prefix followed by as many letters and
  digits as a real key has. GitHub's push protection reads every commit
  pushed, and refuses a branch for one such value, corrected later or not.
- CI's `secrets` job scans every commit with Betterleaks (pinned, with its
  checksum, in the CI workflow), by the rules and filter of
  `.betterleaks.toml`: a made-up value passes when it says `synthetic`,
  or is a credential for 127.0.0.1 or localhost. Make a value pass that
  way, never by widening the filter for one file. Run it locally with
  `betterleaks git . --config .betterleaks.toml --confidence medium
  --redact`. A secret it finds is published already: rotate it first.
- Never name a competitor or another product in this field, in code,
  comments, docs, commits, pull requests or issues. Describe the behaviour
  instead.

## Maintain these guides

Keep agent instructions in the guides: what applies everywhere here, a
package's rules in its own `AGENTS.md`, a server context's in
`src/<context>/AGENTS.md`. Keep setup and development steps in the
[contributing guide](.github/CONTRIBUTING.md), and what Peal is, how to
self-host it and its licensing in the [README](README.md). Beside every
`AGENTS.md`, keep a `CLAUDE.md` holding `@AGENTS.md`, so both clients share
these instructions. This file is read in every session: keep it short, and put
a rule in the guide of the code it governs.
