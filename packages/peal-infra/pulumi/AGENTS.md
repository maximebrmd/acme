# Pulumi

Read the [README](README.md) first: the projects, the state, the
credentials and how to adopt what exists.

- Change Cloudflare only through this project, and run `preview --diff`
  before every `up`. A change made in the dashboard shows as drift in the
  next preview: bring it into the code or undo it.
- `src/` holds the resources, as functions of a stack's decoded settings
  (`src/settings.ts`, Effect Schema); `account/index.ts` and
  `environment/index.ts` are the programs Pulumi runs. Tests run them against
  Pulumi's mocks (`test/support.ts`) and never reach Cloudflare.
- No secret in code or in a `Pulumi.<stack>.yaml` in clear: a stack's
  secrets (the owner's address) are set with `pulumi config set --secret`,
  encrypted with the passphrase, and the secrets it makes (the tunnel's
  token, the buckets' keys) are secret outputs, which only the Ansible
  project's `scripts/cloudflare_from_pulumi.py` reads.
- Resources live in components (`src/account.ts`, `src/environment.ts`).
  What holds data or routes traffic is `protect`ed, and buckets are
  `retainOnDelete`.
- The short-link domain (peal.link) is a zone of its own, in the account
  project (`src/link-domain.ts`): a zone has one ruleset per phase, so its
  redirect and rewrite rules stay there, for every environment's host name
  on it; each environment's stack makes its own record, to its tunnel.
  Short links in production are public, with no Access application; the
  tunnel lets `/api/l/` and a code alone through (the Ansible project's
  cloudflared role): keep the rewrite and that route in step. The rewrite
  leaves `/cdn-cgi/` and `/api/l/` paths alone, and relies on the zone's
  URL normalisation, which stays on, in code.
- Resource names (the first argument) are what the state knows a resource
  by: renaming one makes Pulumi delete it and make it again. Use an alias.
- The sandbox is applied, as production will be: `test/sandbox-resources.ts` pins
  every resource the sandbox's stack makes, by name and inputs, so a change
  there is one its preview shows. Change it only with a change the sandbox
  is meant to take, and preview both stacks before `up`.
- Production is public but for its admin, Grafana and SSH: no Access
  application covers its app, site, docs or short links. Its admin
  application's paths (`adminPaths`) are the Ansible project's
  `peal_access_paths`: change both together.
- The uptime server's part (README.md, "The uptime server"): its records
  in the account's stack, from the optional `peal:uptime` setting, never
  proxied, its addresses a secret setting and secret in the state, so no
  server's address is in Git in clear; the sandbox's service token for its
  checks, let into `access-app` alone by a Service Auth policy that
  includes that token alone, after the owner's. Production has none: its
  checks are public. The token's client id and secret reach the uptime
  server's vault through `scripts/cloudflare_from_pulumi.py --vault-id
  uptime@…`.
- Pin `@pulumi/pulumi` and `@pulumi/cloudflare` exactly, as everything else.
