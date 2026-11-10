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
- Resource names (the first argument) are what the state knows a resource
  by: renaming one makes Pulumi delete it and make it again. Use an alias.
- Pin `@pulumi/pulumi` and `@pulumi/cloudflare` exactly, as everything else.
