# Pulumi

What Peal keeps at Cloudflare, as code: the Zero Trust Access policies and
applications, each environment's tunnel and the host names that point to
it, its R2 buckets with their lifecycle and CORS rules, and the addresses
Email Routing forwards. TypeScript, run by Bun (`runtime: bun`).

| Project       | Stacks                      | What it holds                                                         |
| ------------- | --------------------------- | --------------------------------------------------------------------- |
| `account`     | `peal`                      | What the account shares: the Access policies, the forwarded addresses |
| `environment` | `sandbox` (production next) | An environment's tunnel, host names, Access applications and buckets  |

Each environment's stack reads the policies from the account's stack, so
the account comes first. Pulumi comes before Ansible: the Ansible project
configures the servers behind what this one makes, and its inventory holds
the values this one outputs (the audience tags, the tunnel's id).

## What stays manual

- The tunnel's token, each bucket's key, and the rest of each environment's
  vault (the Ansible project's README, "Credentials"): secrets that would
  otherwise live in Pulumi's state.
- `peal-infra-state`, the bucket that holds the state, its own key, and the
  Cloudflare API token Pulumi uses: what Pulumi needs before it runs.
- Resend's domain and keys, and the Telegram bots.

## State and credentials

The state is in R2's EU jurisdiction, in `peal-infra-state`
(`backend.url` in each `Pulumi.yaml`), and its secrets are encrypted with a
passphrase. `scripts/pulumi.ts` runs the Pulumi CLI in a project with what
it needs, read from `~/.config/peal/` unless already set in the
environment:

| File                      | Becomes                                      | What it is                                                                                                                                         |
| ------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare-pulumi.token` | `CLOUDFLARE_API_TOKEN`                       | An account API token: Access Edit, Cloudflare One Connector: cloudflared Edit, R2 Edit; on the zone, DNS Edit, Zone Read, Email Routing Rules Edit |
| `pulumi-state.env`        | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | An R2 key with Object Read & Write on `peal-infra-state` alone                                                                                     |
| `pulumi-passphrase`       | `PULUMI_CONFIG_PASSPHRASE_FILE`              | The passphrase of the stacks' secrets                                                                                                              |

Keep a copy of each in a password manager: without the passphrase, the
stacks' secrets cannot be read.

```sh
cd packages/peal-infra/pulumi
bun scripts/pulumi.ts account preview --stack peal --diff
bun scripts/pulumi.ts account up --stack peal
bun scripts/pulumi.ts environment preview --stack sandbox --diff
```

Install the Pulumi CLI (3.227 or later, for `runtime: bun`) first. Preview
every change before applying it; a preview with no change is the norm.

## Adopting what exists

A resource made by hand is imported rather than made again:
`PEAL_PULUMI_IMPORT` names a JSON file of `{ "<resource name>": "<id>" }`,
with the id each resource's `pulumi import` documents, and every resource
named there is imported at that id (`src/imports.ts`). Run `preview`, then
`up`, with it once, then without it: the ids then live in the state. Keep
the file out of Git. R2's lifecycle and CORS rules cannot be imported:
declaring the rules a bucket already has writes them again, unchanged. Nor
does Pulumi remove a bucket's lifecycle rules when their resource goes (the
provider warns of it): change them in the code, or remove them in the
dashboard.
