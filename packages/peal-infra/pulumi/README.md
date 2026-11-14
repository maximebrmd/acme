# Pulumi

What Peal keeps at Cloudflare, as code: the Zero Trust Access policies and
applications, each environment's tunnel and the host names that point to
it, its R2 buckets with their lifecycle and CORS rules, the addresses
Email Routing forwards, the short-link domain, peal.link, and the uptime
server's records and service token. TypeScript, run by Bun (`runtime: bun`).

| Project       | Stacks                  | What it holds                                                                                                                                          |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `account`     | `peal`                  | What the account shares: the Access policies, the forwarded addresses, the short-link domain, the uptime server's records, the Bluesky handle's record |
| `environment` | `sandbox`, `production` | An environment's tunnel, host names (its short-link one included), Access applications, buckets, the sandbox's service token for the uptime server     |

Each environment's stack reads the policies from the account's stack, so
the account comes first. Pulumi comes before Ansible: the Ansible project
configures the servers behind what this one makes, and its inventory holds
the values this one outputs (the audience tags, the tunnel's id).

## The two environments

Both stacks make the same tunnel, records, buckets, keys and bucket rules,
on their own names (`Pulumi.<stack>.yaml`). They differ by what Access
guards, as the Ansible project's `peal_access_everything` says:

| What                        | `sandbox`                                                                                                               | `production`                                                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Host names                  | `sandbox`, `sandbox-site`, `sandbox-docs`, `sandbox-grafana`, `sandbox-ssh`                                             | `app`, the bare domain (`@`: `peal.social`, which Cloudflare flattens), `docs`, `grafana`, `ssh`                                             |
| Short links                 | `sandbox.peal.link`                                                                                                     | `peal.link`                                                                                                                                  |
| Access applications         | `access-app` (app, site, docs, short links), `access-callbacks` (Bypass), `access-grafana`, `access-ssh`                | `access-admin` (the admin's five paths on the app), `access-grafana`, `access-ssh`: none over the app, the site, the docs or the short links |
| Audience tags (`accessAud`) | `app`, `grafana`, `ssh`                                                                                                 | `admin`, `grafana`, `ssh`                                                                                                                    |
| Uptime checks               | `uptime-token`, a service token, let into `access-app` alone by `uptime-service-auth` (Service Auth), its second policy | None: its checks are public                                                                                                                  |

`access-admin`'s paths are the Ansible project's `peal_access_paths`
(`/api/auth/admin`, `/api/admin`, `/admin`, `/en/admin`, `/fr/admin`):
a path added there is added to `adminPaths` in `src/environment.ts`.
`test/sandbox-resources.ts` holds every resource the sandbox's stack makes,
by name and inputs: the sandbox is applied, and a change there is a change
its preview shows.

## Secrets and Ansible

An environment's stack also makes each bucket's key, an account token
limited to reading and writing that bucket (its id is the access key id,
the SHA-256 of its value the secret access key), and gives the tunnel's
token: secret outputs, encrypted in the state. The Ansible project's
`scripts/cloudflare_from_pulumi.py` writes them into the environment's vault,
and the stack's public values (audience tags, buckets, endpoints) into its
`group_vars/<environment>/cloudflare.yml`: run it after each `up` of the
environment, then `site.yml`. A key is rotated by replacing its resource
(`pulumi up --replace <urn>`), then the same two steps. The sandbox's
service token goes to the uptime server's vault instead ([The uptime
server](#the-uptime-server)).

The tunnel, the host names, the buckets and the account's policies are
protected (the uptime server's records too, but not its service token):
`up` refuses to delete them, and a bucket removed from the code stays at
Cloudflare with its data (`retainOnDelete`). Each project's resources are
grouped in a component (`peal:cloudflare:Account`,
`peal:cloudflare:Environment`).

## The short-link domain

Short links are on a domain of their own, peal.link, so that a platform
which frowns on a host that redirects marks it, never the host people sign
in at. The account project holds its zone and what applies to the whole of
it (`src/link-domain.ts`): a zone has one ruleset per phase, which the
environments share.

| What              | How                                                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The zone          | `link-zone`, which Cloudflare Registrar made: imported (below), protected, kept at Cloudflare if its resource goes                                                                                |
| DNSSEC            | On; Cloudflare Registrar publishes the DS record itself, in a day or two: until then the API says `pending`, and a preview may show `link-dnssec` as a change, which is not drift                 |
| Zone settings     | Always Use HTTPS, TLS 1.2 at least, SSL Full (strict), and incoming URLs normalised (`link-url-normalization`)                                                                                    |
| Mail              | None: a null MX (`0 .`), `v=spf1 -all`, and DMARC `p=reject` for the domain and its subdomains                                                                                                    |
| `peal.link/`      | A 302 to `https://peal.social/`, so browsers keep nothing should the domain get a page of its own                                                                                                 |
| `peal.link/<any>` | Rewritten to `/api/l/<any>`, but for `/cdn-cgi/*` (Cloudflare's own) and a path under `/api/l/` already; the tunnel sends it to the server when it is a code (seven letters and digits), 404 else |

Each environment's stack points its own host name on the zone
(`shortLinkHost`) at its tunnel, from the zone id the account's stack
outputs (`linkZoneId`): `sandbox.peal.link` for the sandbox, behind its
Access application like the rest of it; `peal.link` for production, public,
in no Access application. Never make the record with `cloudflared tunnel
route dns`, which can put it in peal.social's zone. An unknown code answers the server's 404, and a path that
is no code cloudflared's: neither leads to the site, so a mistyped or
erased link says it is not one.

That no path on the host reaches anything but the redirect rests on two
things: the tunnel's route takes `/api/l/` and a code alone, and the edge
normalises incoming URLs before the rewrite reads the path, so dot
segments, repeated slashes and backslashes are resolved and the server gets
`/api/l/` followed by the rest. cloudflared matches a cleaned path but
forwards the one it was sent: with normalisation off, a path such as
`/api/l/../admin/…%2F..%2Fl/x` could match the route and reach another of
the server's routes, with no Access on this host. So the normalisation is
in code (`link-url-normalization`): never turn it off in the dashboard.

## The uptime server

The uptime server (the Ansible project's README, "Uptime") checks
production and the sandbox from outside Cloudflare, and serves the status
page. Two things of it are here.

**Its records**, in the account's stack: `uptime-a` and `uptime-aaaa`, its
name's A and AAAA records, and `status-cname`, the status page's name, a
CNAME to it, in the peal.social zone. None is proxied (`proxied: false`):
the status page and the heartbeat's endpoint then answer when Cloudflare
does not, and Caddy's TLS-ALPN challenge reaches the server. They come from
the stack's optional `peal:uptime` setting; unset, the stack makes none of
them. Set it once the server exists, its names as the Ansible project's
`uptime_hostname` and `uptime_status_hostname` have them, as first-level
labels, and its addresses as secrets, so they stay out of Git in clear:

```sh
bun scripts/pulumi.ts account config set --stack peal --path peal:uptime.hostname uptime
bun scripts/pulumi.ts account config set --stack peal --path peal:uptime.statusHostname status
bun scripts/pulumi.ts account config set --stack peal --path --secret peal:uptime.ipv4   # asks for it
bun scripts/pulumi.ts account config set --stack peal --path --secret peal:uptime.ipv6   # asks for it
```

`ipv6` is optional: leave it out when the server's web server answers on
IPv4 alone. The addresses are secret in the state too, so a preview shows
the A and AAAA records' content as `[secret]`. A new address is a new
`config set` and an `up`; the CNAME follows.

**The sandbox's service token**, in the sandbox's stack: `uptime-token`,
which the uptime server's checks of the sandbox carry, and
`uptime-service-auth`, a policy with the action Service Auth that includes
that token alone, by its id, added to `access-app` after the owner's
policy and to no other application. Its client id and secret are the
stack's secret output `uptimeAccessToken`, and when it ends is
`uptimeAccessTokenExpiresAt`. `scripts/cloudflare_from_pulumi.py` writes
them into the uptime server's vault, as `uptime_credentials.SANDBOX_ACCESS_CLIENT_ID`
and `…_SECRET`, from `group_vars/uptime/vault.yml` made from
`inventory/vault.uptime.example.yml`:

```sh
cd ../ansible
uv run python scripts/cloudflare_from_pulumi.py --vault-id uptime@scripts/vault-keychain-client.py
```

then `uptime.yml`. The token lasts a year (`duration: 8760h`, in
`src/environment.ts`): when it ends, every check of the sandbox fails at
once. Renew it before, in the dashboard (Zero Trust › Access › Service
credentials, the token, Refresh), which pushes its end a year on and keeps
its id and secret: nothing else changes, and the next preview shows none.
Replace it (`pulumi up --replace <its urn>`) when its secret may have
leaked, then run the script and `uptime.yml` again.

Order: the account's stack (the records) and the sandbox's (the token),
then the script, then `uptime.yml`, whose Caddy needs the records to get its
certificates.

## What stays manual

- The rest of each environment's vault (the Ansible project's README,
  "Credentials"): Resend, Telegram, the backup passphrase; and the uptime
  server's Telegram bot.
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

| Variable                                     | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`                       | An account API token: Access: Apps and Policies Edit, Access: Service Tokens Edit, Cloudflare One Connector: cloudflared Edit, R2 Edit, Account API Tokens Edit; on peal.social, DNS Edit, Zone Read, Email Routing Rules Edit; on peal.link, DNS Edit (DNSSEC too), Zone Read, Zone Settings Edit, Sanitize Edit (URL normalisation: the endpoint refuses an account token without it, whatever its reference lists), Dynamic URL Redirects Edit (single redirects), Zone Transform Rules Edit |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | An R2 key with Object Read & Write on `peal-infra-state` alone                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `PULUMI_CONFIG_PASSPHRASE`                   | The passphrase of the stacks' secrets                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

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

Production's stack file is committed without its salt: `bun scripts/pulumi.ts
environment stack init production` adds it (`encryptionsalt`), keeping the
settings; commit it then. Its stack needs no secret setting.

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

The peal.link zone is adopted so, once: put its zone id (the dashboard,
peal.link › Overview, "Zone ID") in a file outside Git as
`{ "link-zone": "<zone id>" }`, and run the account's `preview` and `up`
with `PEAL_PULUMI_IMPORT` naming it. The preview then imports `link-zone`
and creates the rest of the domain; one that creates `link-zone` instead
lacks the file, and `up` would fail at Cloudflare, which holds one zone of
a name per account. The zone settings and DNSSEC are created by setting
them on the zone as it is, and need no import.
