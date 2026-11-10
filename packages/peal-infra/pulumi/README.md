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

## Secrets and Ansible

An environment's stack also makes each bucket's key, an account token
limited to reading and writing that bucket (its id is the access key id,
the SHA-256 of its value the secret access key), and gives the tunnel's
token: secret outputs, encrypted in the state. The Ansible project's
`scripts/cloudflare_from_pulumi.py` writes them into the environment's vault,
and the stack's public values (audience tags, buckets, endpoints) into its
`group_vars/<environment>/cloudflare.yml`: run it after each `up` of the
environment, then `site.yml`. A key is rotated by replacing its resource
(`pulumi up --replace <urn>`), then the same two steps.

The tunnel, the host names, the buckets and the policies are protected:
`up` refuses to delete them, and a bucket removed from the code stays at
Cloudflare with its data (`retainOnDelete`). Each project's resources are
grouped in a component (`peal:cloudflare:Account`,
`peal:cloudflare:Environment`).

## What stays manual

- The rest of each environment's vault (the Ansible project's README,
  "Credentials"): Resend, Telegram, the backup passphrase.
- `peal-infra-state`, the bucket that holds the state, its own key, and the
  Cloudflare API token Pulumi uses: what Pulumi needs before it runs.
- Resend's domain and keys, and the Telegram bots.

## State and credentials

The state is in R2's EU jurisdiction, in `peal-infra-state`
(`backend.url` in each `Pulumi.yaml`), and its secrets are encrypted with a
passphrase. `scripts/pulumi.ts` runs the Pulumi CLI in a project with what
it needs, unless already set in the environment, read from one item of the
owner's login keychain, `peal-pulumi`, and handed to Pulumi in its
environment alone, never a file:

| Variable                                     | What it is                                                                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`                       | An account API token: Access Edit, Cloudflare One Connector: cloudflared Edit, R2 Edit, Account API Tokens Edit; on the zone, DNS Edit, Zone Read, Email Routing Rules Edit |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | An R2 key with Object Read & Write on `peal-infra-state` alone                                                                                                              |
| `PULUMI_CONFIG_PASSPHRASE`                   | The passphrase of the stacks' secrets                                                                                                                                       |

The password manager holds them; the keychain item is a copy for the
scripts, which a password manager's own keychain does not let them read.
`bun scripts/keychain.ts` writes it: copy each value from the password
manager when it asks, and it reads the clipboard, then empties it. The
item trusts no application, so macOS asks before each run reads it: allow
it once, never "Always Allow", which would let any program of the session
read it unasked. Without the passphrase, the stacks' secrets cannot be
read: keep it in the password manager.

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
