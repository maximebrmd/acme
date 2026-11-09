# Infrastructure

Ansible for the servers Peal runs on, production and the sandbox, each a
server at a European provider reachable only through a Cloudflare Tunnel,
and for the uptime server that watches them from outside, at another
provider and in another city. Nothing here has been applied yet, and no
provider is chosen: the inventory names the hosts on `peal.social` but holds
placeholders for the rest (`203.0.113.0/24`, `example-team`, `REPLACE…`,
each server's `hosting_provider` and `hosting_location`), and every playbook
refuses to run until they are replaced.

Self-hosters do not need this folder: Caddy and Compose are enough (the docs'
self-hosting page, and [`peal-docker`](../peal-docker)).

## How it fits together

| Piece     | What it is                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Server    | Ubuntu LTS at a European provider ([which one](#choosing-a-provider-and-a-size)), security updates daily, the `ops` account with an SSH key |
| Edge      | `cloudflared` on the host dials out to Cloudflare; no inbound port is open, SSH included                                                    |
| Access    | Cloudflare Zero Trust Access guards Grafana, SSH, the admin and the whole sandbox                                                           |
| Stack     | [`compose.production.yaml`](../peal-docker/compose.production.yaml) as the Compose project `peal`, every port on 127.0.0.1                  |
| Telemetry | The OpenTelemetry Collector, Loki, Tempo, Prometheus and Grafana, in the stack                                                              |
| Alerts    | Grafana's alert rules, sent to a Telegram chat                                                                                              |
| Backups   | pgBackRest archives the write-ahead log and backs Postgres up to Cloudflare R2                                                              |
| Uptime    | Gatus on a server of its own checks the public endpoints, hears Grafana's heartbeat and serves the status page ([Uptime](#uptime))          |

The tunnel's routes, for production (`roles/cloudflared/templates/config.yml.j2`):

| Host name             | Path                                                                    | Goes to                     | Access    |
| --------------------- | ----------------------------------------------------------------------- | --------------------------- | --------- |
| `grafana.peal.social` | any                                                                     | Grafana, 127.0.0.1:13000    | team only |
| `ssh.peal.social`     | any                                                                     | sshd, 127.0.0.1:22          | team only |
| `app.peal.social`     | `/api/auth/admin/*`, `/api/admin/*`, `/admin`, `/en/admin`, `/fr/admin` | the server or the web app   | team only |
| `app.peal.social`     | `/api/*`, `/.well-known/oauth-*`                                        | the server, 127.0.0.1:3000  | public    |
| `app.peal.social`     | anything else                                                           | the web app, 127.0.0.1:3001 | public    |
| `peal.social`         | any                                                                     | the site, 127.0.0.1:4321    | public    |
| `docs.peal.social`    | any                                                                     | the docs, 127.0.0.1:4322    | public    |

The sandbox has the same routes on its own names (`sandbox.peal.social`,
`sandbox-grafana.peal.social`…), all behind Access but for what outside
services call: `/api/channels/oauth/*`, which Bluesky's servers fetch, and
Stripe's webhook (`/api/auth/stripe/webhook`) and Meta's data deletion
requests (`/api/data-deletion/facebook` and `/threads`), which the server
checks the signature of. Cloudflare's free certificate covers the zone and
its first-level subdomains only, so no name goes deeper than that.

A rule with Access needs an Access application at Cloudflare's edge, and
cloudflared checks the token Access adds too, so a route left without an
application refuses every request rather than opening. cloudflared matches a
rule's path after resolving dot segments, backslashes and repeated slashes
(since 2026.10.0), and the admin paths in any letter case, so no way of
writing a path reaches the admin without the token;
[`tests/test_cloudflared.py`](tests/test_cloudflared.py) tries them. Grafana
signs people in from that token as Admins of its organisation, with full
access: whoever Grafana's Access policy lets through, the staff, can change
data sources, dashboards, alerting and users, and Grafana sets the role again
at each sign-in. Its `admin` account, whose password is generated on the
server, is the way in when Access is down.

Cloudflare's edge waits up to 100 seconds for an answer, and the writing
assistant answers within 90, so the tunnel needs no timeout of its own.

### Roles

| Role             | What it does                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `peal_preflight` | Stops every playbook while the inventory holds placeholders                                          |
| `system`         | Host name, UTC, updates, unattended upgrades with reboots at 03:30 UTC, swap, journal size           |
| `ssh`            | The `ops` account, its keys (exclusive) and key-only SSH for it alone, without port forwarding       |
| `docker`         | Docker Engine and Compose from Docker's repository, at exact versions, with rotated logs             |
| `cloudflared`    | cloudflared from its GitHub release (checked by digest), the tunnel's routes and its systemd service |
| `firewall`       | ufw: every incoming connection refused; port 22 open only while bootstrapping                        |
| `peal_runtime`   | `/srv/peal`, the secrets generated there, the credentials, the host settings and `peal-compose`      |
| `peal_backup`    | `peal-backup` and its timers: a full backup on Sundays, a differential one the other days            |
| `peal_release`   | Builds, uploads and starts one commit of Peal (`release.yml`)                                        |
| `uptime`         | Gatus and Caddy on the uptime server, their configuration from the inventory (`uptime.yml`)          |

### Playbooks

| Playbook        | When                                                                            |
| --------------- | ------------------------------------------------------------------------------- |
| `bootstrap.yml` | Once on a new server, as root: it creates `ops`                                 |
| `site.yml`      | Any time; it converges the server to this folder                                |
| `release.yml`   | To deploy `main`, or another branch, tag or commit with `-e peal_version=<ref>` |
| `uptime.yml`    | Any time, on the uptime server alone; it converges it to this folder            |

Run each with `--limit production` or `--limit sandbox` (`--limit uptime` for
`bootstrap.yml` on the uptime server), and `site.yml` and `uptime.yml` with
`--check --diff` first. `release.yml` has no dry run.

### On the server

| Path                          | What it holds                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/srv/peal/secrets.env`       | The database password, `BETTER_AUTH_SECRET`, `PEAL_TOKEN_KEYS`, Grafana's admin password and the Bluesky client keys, generated there once |
| `/srv/peal/credentials.env`   | What outside services issued: R2 keys, the email key, the backup passphrase, Telegram's                                                    |
| `/srv/peal/host.env`          | Plain settings, written by Ansible                                                                                                         |
| `/srv/peal/release.env`       | The image tags that run                                                                                                                    |
| `/srv/peal/releases/<commit>` | Each release's Compose file and configuration, the last three kept                                                                         |
| `/srv/peal/current`           | Link to the release that runs                                                                                                              |
| `/etc/cloudflared/`           | The tunnel's routes and its token                                                                                                          |

`peal-compose` runs Docker Compose on the release that runs, with those
files. SSH is for reading:

```sh
ssh ops@ssh.peal.social sudo peal-compose ps
ssh ops@ssh.peal.social sudo peal-compose logs --tail 50 server
ssh ops@ssh.peal.social systemctl list-timers 'peal-*'
ssh ops@ssh.peal.social sudo peal-compose exec --user postgres postgres pgbackrest info
```

Your `~/.ssh/config` sends those through the tunnel:

```
Host ssh.peal.social sandbox-ssh.peal.social
  User ops
  ProxyCommand cloudflared access ssh --hostname %h
```

## Choosing a provider and a size

No provider is chosen, and nothing in this folder depends on one: the roles
use no provider's API, module or collection, and the servers are created by
hand in a console. What a choice changes is the inventory: each server's
address in `hosts.yml`, and its `hosting_provider` and `hosting_location`
(the city) in its group's `main.yml`, placeholders until then. Production
and the sandbox may share a provider; the uptime server shares neither a
provider nor a city with them ([Uptime](#uptime)).

### What the stack needs of a provider

| Need                         | Why                                                                                                                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A European company           | Production holds customers' data: the provider is a processor, with a data processing agreement, and its data centres are in the EU                                                                                                                                        |
| An Ubuntu LTS image          | The roles are written for it: apt, unattended upgrades, ufw, sshd's drop-in folder, and Docker's packages, pinned for the release the server runs (`docker_packages`: 24.04 or 26.04)                                                                                      |
| x86-64 or Arm64              | Either: `release.yml` builds the images for each server's own architecture, and cloudflared's package is pinned for both ([Architecture](#architecture))                                                                                                                   |
| A public IPv4 address        | The servers dial out over it: GitHub, which cloudflared's package comes from, has no IPv6 address. The uptime server is reached on it                                                                                                                                      |
| An IPv6 address              | For the uptime server, whose name has an AAAA record beside its A record. Production and the sandbox need none                                                                                                                                                             |
| A firewall in front          | Beside ufw on the server: no inbound rule for production and the sandbox, but port 22 from your address while one is bootstrapped; for the uptime server, port 443 from anywhere and port 22 from the addresses you work from                                              |
| Snapshots                    | Before a change that is hard to undo, such as a Docker Engine or Ubuntu upgrade. A snapshot holds the server's secrets: keep it at the provider, and delete it after. It replaces no backup ([Backups](#backups))                                                          |
| A rescue system or a console | The way in when the tunnel stops carrying SSH, with port 22 closed. Neither root nor `ops` has a password, so a console that only offers a login prompt lets nobody in: it takes a rescue system that mounts the server's disk ([Without the tunnel](#without-the-tunnel)) |
| A disk that grows            | Postgres's and the telemetry's volumes are on the root disk, under `/var/lib/docker`; media are in the bucket                                                                                                                                                              |

Nothing else: no load balancer, as the tunnel is the one entry; no private
network while one server runs the stack; no managed database, as Postgres
runs in the stack with its own backups. Outgoing connections are all the
servers open, to the tunnel, the platforms, the bucket, the mail service
and the package repositories.

### Architecture

`release.yml` builds each image on the machine running Ansible for the
server it goes to, from the server's facts: `linux/amd64` on an x86-64
server, `linux/arm64` on an Arm one. Built on a machine of the same
architecture, as an Apple silicon Mac for an Arm server, the build is
native. For the other architecture, Buildx emulates it, more slowly: Docker
Desktop and OrbStack ship the emulation, and on Linux
`docker run --privileged --rm tonistiigi/binfmt --install arm64` (or
`amd64`) installs it. `-e peal_image_platform=linux/arm64`, or the same in
the inventory, builds for a platform whatever the server's facts say. Each
platform has its own archive under `.ansible/release`, so one built for the
other is never uploaded.

Choose the architecture for good. PostgreSQL restores a backup on the
hardware architecture it was taken on and no other
([its documentation](https://www.postgresql.org/docs/18/warm-standby.html#STANDBY-PLANNING)),
so [the runbook](runbooks/restore-database.md#a-new-server) carries a
database to a new server of the same architecture only. Moving to the other
one takes a dump of the database (`pg_dump`) loaded into a new server, with
the stack stopped meanwhile, which nothing here does yet.

### Size

These sizes come from a model of the load the code puts on a server, not
from measurements: each account, idle ones included, counted as four
channels and thirty posts a month to two or three of them, read by the
hourly analytics for thirty days. The model gives a database of about 15 GB
after a year for 1,000 users, 45 GB for 3,000 and 150 GB for 10,000, and a
few requests a second at most: memory and the disk fill long before the
processors do. Check a provider's current plans against the shapes, and
measure before moving up.

| Users        | Production                                          | Postgres                                                                                                                            |
| ------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| About 1,000  | One server: 4 vCPUs, 16 GB of memory, a 100 GB disk | On it, with the rest of the stack                                                                                                   |
| About 3,000  | One server: 8 vCPUs, 32 GB of memory, a 200 GB disk | On it                                                                                                                               |
| About 10,000 | The app's server: 8 vCPUs, 32 GB, a 100 GB disk     | A machine of its own: 6 dedicated cores or more, 32 GB, two local NVMe disks mirrored, and a standby like it in another data centre |

The sandbox is a small copy at any size, 2 vCPUs, 8 GB and a 50 GB disk,
and the uptime server needs 1 vCPU, 1 GB and 10 GB. Shared vCPUs do for the
first two sizes. Going from the first to the second is a resize in the
provider's console, a few minutes down, with nothing to change here but
`swap_size_mb` if you want more.

Move up when one of these holds for days:

- the hourly analytics run takes more than 30 minutes;
- Postgres reads from disk more than 1 time in 100, or the database is
  larger than half the memory;
- memory stays above 80%, or swap is used every day;
- the disk is 70% full (Grafana alerts at 85%);
- the processors lose more than 10% of their time to other tenants
  (steal): take dedicated vCPUs.

One process runs every job, so the app grows by taking a bigger server, not
a second one.

**The third size is not built yet.** Everything here runs one server per
environment: `compose.production.yaml` starts Postgres beside the server,
the inventory has one host for each environment, `release.yml` stops and
starts both on that host, and `peal_backup` runs where Postgres does.
Putting Postgres on its own machine takes, before any is ordered:

- the stack's Compose file split, so a database host runs Postgres alone,
  and the app's `DATABASE_URL` naming it;
- a `database` group in the inventory, a private network between the two
  hosts, and a firewall rule that opens Postgres's port to it alone;
- `release.yml` stopping the old server on one host before Postgres
  restarts on the other;
- a standby that follows the primary, built from the backups, and a runbook
  to promote it.

Until then, a larger single server, with more memory than the second size,
is the way past 3,000 users.

## Run the playbooks

You need [uv](https://docs.astral.sh/uv/), `cloudflared` (`brew install
cloudflared`), Git, and Docker with Buildx, which builds the images for the
servers' architecture: each server's own, from its facts (`linux/amd64` on
x86 servers, `linux/arm64` on Arm ones), unless `peal_image_platform` names
another in the inventory or with `-e`. Docker Desktop and OrbStack emulate
`linux/amd64` on Apple silicon. From this folder:

```sh
uv sync --locked
uv run ansible-galaxy collection install --requirements-file requirements.yml
uv run ansible-playbook playbooks/site.yml --limit sandbox --check --diff
```

Check mode works on a new server too, once `bootstrap.yml` has run: a task
that needs what an earlier one would make, such as Docker's configuration
before Docker is installed, skips when that one reports a change, and the
next run shows it. It reads the server's package lists, which refresh daily.

`bun nx run peal-infra:test` runs ansible-lint with the production profile,
`ansible-playbook --syntax-check` on every playbook, and the tests in
[`tests/`](tests) (`uv run pytest`), which read what Ansible renders for each
server:

- the tunnel's routes, and what host.env may hold;
- the secrets the server generates, and the swap file's creation;
- Docker Engine's pins, and the platform images are built for;
- the release's steps on Postgres, run against its image;
- the uptime server: its checks against each environment's host names, then
  Gatus and Caddy run with the configuration Ansible renders, on a network
  that reaches nothing outside, to show that Gatus loads it and takes a
  heartbeat with its token only, and that Caddy shows the world nothing else.

The tests that need Docker skip when it is not running. `bun run test`
includes them.

Each of these commands reads stdin from `/dev/null`. Nx gives every task it
runs the same stdin, which a Node task reading it makes non-blocking for all
of them while it runs; Ansible then refuses to start ("Ansible requires
blocking IO on stdin/stdout/stderr"), and ansible-lint reports it as "Unable
to find a working copy of ansible executable".

### Before the first run

These are made by hand, by the owner, on free plans. Anything that costs
money, the server and the domain first, or R2 beyond its free tier, needs
the owner's approval.

1. **The zone** on Cloudflare, for the domain.
2. **Zero Trust**: a team (`<team>.cloudflareaccess.com`) and these Access
   applications, each with a policy that lets in the team's emails. Copy each
   application's audience tag (AUD) into `cloudflare_access_aud`.
   - Grafana: `grafana.peal.social`.
   - SSH: `ssh.peal.social`.
   - Admin: `app.peal.social/api/auth/admin`, `app.peal.social/api/admin`
     (the staff console's API), `app.peal.social/admin`,
     `app.peal.social/en/admin` (where Next also serves English pages) and
     `app.peal.social/fr/admin`.
   - Sandbox: its app, site and docs names; an application with a Bypass
     policy for everyone on each path outside services call,
     `sandbox.peal.social/api/channels/oauth` for Bluesky,
     `sandbox.peal.social/api/auth/stripe/webhook` for Stripe, and
     `sandbox.peal.social/api/data-deletion` for Meta; and its own Grafana and
     SSH applications. The uptime server's checks of the sandbox need a
     service token and a Service Auth policy on its application too (see
     [Uptime › Set it up](#set-it-up)).
3. **A tunnel per environment**, locally managed so `config.yml` holds its
   routes, from your own machine:

   ```sh
   cloudflared tunnel login                              # once, a certificate for your account
   cloudflared tunnel create peal-production
   cloudflared tunnel route dns peal-production app.peal.social   # and each other name
   cloudflared tunnel token peal-production              # the token for the vault
   ```

4. **R2**: a media bucket and a backup bucket per environment, created in
   R2's EU jurisdiction (their endpoint is
   `<account>.eu.r2.cloudflarestorage.com`), which cannot be changed once a
   bucket exists: a bucket made without it is deleted while empty and made
   again. An API token with Object Read & Write on each bucket alone, and on
   the media bucket a lifecycle rule that aborts incomplete multipart uploads
   after a day; never an expiry rule on a backup bucket, as pgBackRest keeps
   its own and a restore needs every WAL file. With Wrangler, every bucket
   command takes `--jurisdiction eu`:

   ```sh
   wrangler r2 bucket create peal-production-media --jurisdiction eu
   wrangler r2 bucket info peal-production-media --jurisdiction eu   # check its jurisdiction
   wrangler r2 bucket lifecycle add peal-production-media abort-incomplete-uploads --abort-multipart-days 1 --jurisdiction eu
   ```

   Put the upload CORS rule on the media bucket with
   `bun nx run peal-server:media-cors`, from your machine, with a token that
   may change the bucket's settings, or paste the policy it prints into the
   dashboard (R2 › the bucket › Settings › CORS policy), which needs no such
   token.

5. **Telegram**: a bot from @BotFather per environment, each writing to a
   private channel, and that chat's id. Read the id from Telegram Web's
   address bar rather than calling `getUpdates`, which puts the bot's token
   in a URL. The uptime server has a bot of its own.
6. **Email**: a Resend key for the verified sending domain `mail.peal.social`,
   which sends as `notifications@mail.peal.social` (`peal_mail_from`).

### Credentials

The server generates its own secrets and they never leave it. What outside
services issue reaches it in one of two ways:

- **The vault**: copy `inventory/vault.example.yml` to
  `inventory/group_vars/<environment>/vault.yml`, which Git ignores, fill it
  in, encrypt it with `uv run ansible-vault encrypt`, and add
  `--ask-vault-pass` to every run. Ansible writes the values to the server and
  never prints them.
- **On the server**: leave the vault out and write the same values there, as
  `NAME='value'` lines, over SSH:

  ```sh
  ssh -t ops@ssh.peal.social 'sudo install -m 600 /dev/null /srv/peal/credentials.env && sudoedit /srv/peal/credentials.env'
  ssh -t ops@ssh.peal.social 'sudo install -o root -g cloudflared -m 440 /dev/stdin /etc/cloudflared/token'
  ```

`site.yml` stops and names what is missing either way. Keep a copy of the
backup passphrase (`PGBACKREST_REPO1_CIPHER_PASS`) outside the server, in a
password manager: the backups cannot be read without it.

### A new server

1. Create it in the provider's console, with your SSH key for root, the
   provider's firewall with no inbound rule, and its address in
   `inventory/hosts.yml`.
2. `uv run ansible-playbook playbooks/bootstrap.yml --limit production -e ansible_user=root -e ssh_via_tunnel=false`
3. `uv run ansible-playbook playbooks/site.yml --limit production -e ssh_via_tunnel=false`:
   port 22 stays open while the tunnel comes up. With the provider's
   firewall in front, open 22 there for your address for these two runs.
4. Check SSH through the tunnel: `ssh ops@ssh.peal.social true`.
5. `uv run ansible-playbook playbooks/site.yml --limit production`: Ansible
   now connects through the tunnel, and port 22 closes.
6. `uv run ansible-playbook playbooks/release.yml --limit production`.
7. Take the first backup, `ssh ops@ssh.peal.social sudo systemctl start peal-backup@full`,
   and send a test alert from Grafana (Alerting › Contact points › Telegram ›
   Test).
8. For production, once the uptime server runs: give it its heartbeat token
   ([The heartbeat](#the-heartbeat)). Until then, set `peal_heartbeat_url` to
   `""` in `group_vars/production/main.yml`: while it names the uptime
   server, `site.yml` requires the credential `PEAL_HEARTBEAT_TOKEN`.

### Without the tunnel

Once the tunnel carries SSH, port 22 is closed, and no account has a
password: when the tunnel stops for good (its token revoked, cloudflared
broken), the provider's rescue system is the way back in.

1. Open port 22 to your address alone in the provider's firewall.
2. Boot the server into the rescue system, mount its disk, and set
   `ENABLED=no` in its `etc/ufw/ufw.conf`: ufw then stays off when the
   server starts. Boot the server from its disk again.
3. `ssh ops@<address>` answers, with your key. Run
   `site.yml --limit production -e ssh_via_tunnel=false`, which turns ufw
   back on with port 22 open, rate limited, and writes the tunnel's routes
   again, and its token when the vault holds a new one.
4. Once `ssh ops@ssh.peal.social true` works again, run `site.yml` without
   the setting, which closes port 22, and close it in the provider's
   firewall.

## Releases

`release.yml` checks the commit out from GitHub on the machine running
Ansible, builds there the images of the four (`peal-server`, `peal-web`,
`peal-static` with the environment's site and docs URLs, and `peal-postgres`,
named after its Dockerfile) that the server does not have yet, and uploads
them over SSH. An image the server has is never uploaded again, so Postgres's
changes, and Postgres restarts, only when its Dockerfile does. The servers
hold no repository or registry credentials, and only pushed commits can be
released. Then, on the server:

1. when Postgres is to restart, because its image or its settings changed,
   the old server stops first, with 75 seconds to finish its calls to the
   platforms;
2. Postgres starts, and keeps the database password in step with
   `secrets.env`;
3. the new server starts and applies its migrations before it listens;
4. the rest of the stack starts, and the release is checked on the server and,
   for production, through the tunnel.

Release the sandbox first. To roll back, release the previous commit. Images
no container uses are removed once they are a week old, counted from when
they were built: an older release's are built and uploaded again. Migrations
do not run backwards, so write each one so that the release before it still
runs against it.

Every container of the stack runs on a read-only file system, writing only
to its volumes and to small tmpfs mounts, and none gains privileges it was
not started with.

## Backups

Postgres archives each write-ahead log segment to the backup bucket as soon as
it fills, or after 5 minutes. `peal-backup` takes a full backup on Sundays and
a differential one the other days, at 02:15 UTC, and pgBackRest keeps four
full backups with what they need: point-in-time recovery over the last three
weeks at least, four just before a Sunday's backup expires the oldest, with
at most 5 minutes lost. Backups are compressed and encrypted with the backup
passphrase before they leave the server. Each one that finishes reports to the
collector, and Grafana alerts when none has for 30 hours, and when the disk is
85% full, as a stuck archive would make it.

pgBackRest rather than WAL-G: it comes from the PostgreSQL project's signed
apt repository, which the official Postgres image already trusts, at an exact
version and for both architectures, while WAL-G would be a binary checked by
hand-kept digests; it releases more often (2.60.0 in October 2026); and its
`check`, `info` and `verify` commands, retention by full backup and
`--type=time` restores make the runbook short.

Deleted data leaves the backups once the oldest backup that holds it expires,
within five weeks. A restore brings back the accounts and workspaces deleted
after its point in time, and nothing records them outside the database yet:
[the runbook](runbooks/restore-database.md#deletions-since-the-restore-point)
says what to do until it does.

Media live in R2 and are not backed up again; telemetry is not backed up. The
secrets are on the server only: [restoring onto a new server](runbooks/restore-database.md#a-new-server)
says what that costs.

[`runbooks/restore-database.md`](runbooks/restore-database.md) restores the
database, to its latest state or to a time.

## Uptime

A separate server watches production and the sandbox from outside, as
people reach them, with [Gatus](https://github.com/TwiN/gatus): if
Cloudflare, the tunnel or a server is down, its alerts still go out. It is
not linked to them: no tunnel, no private network, and no secret of theirs.
It is at another provider than theirs, and in another city: another
company's network, console and account, which an outage or a suspension
takes whole, and another power supply. The `uptime` role refuses to run
while its `hosting_provider` or `hosting_location` is one production or the
sandbox has, and [`tests/test_hosting.py`](tests/test_hosting.py) checks
the inventory.
`uptime.yml` sets it up with the same roles (`ops`, key-only SSH, ufw,
unattended upgrades, Docker), then the `uptime` role runs Gatus and Caddy in
Docker, each pinned by digest, as the Compose project `uptime` in
`/srv/uptime`.

### What it checks

Gatus's configuration is generated from the inventory: `uptime_environments`
in `group_vars/uptime/main.yml` lists each environment's public host names
(kept equal to its `peal_hostnames` by `tests/test_uptime.py`), and the
role's defaults the checks, every minute unless said otherwise:

| Check                    | Passes when                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| The site (`/`)           | 200 within 1 second                                                   |
| The docs (`/`)           | 200 within 1 second                                                   |
| The web app (`/sign-in`) | 200 within 2 seconds                                                  |
| The API (`/api/ready`)   | 204 within 1 second: the server answers, and its database too         |
| Each host's certificate  | Valid for 14 more days, the uptime server's own included (hourly)     |
| Each host's DNS          | An A record through Quad9 (`9.9.9.9`), outside Cloudflare (5 minutes) |
| Each Grafana heartbeat   | One in the last 15 minutes ([The heartbeat](#the-heartbeat))          |

A redirect fails a check, so a page that sends people to Cloudflare Access's
sign-in never passes for the page. The sandbox is behind Access throughout:
its checks carry a Cloudflare Access service token, which the sandbox's
Access application lets in with a Service Auth policy. Telegram hears of a
page or the API after 3 failures in a row, and that it is back after 2
successes; of a certificate, a host name or a heartbeat at once.

### Set it up

The server costs money, so it needs the owner's approval, like any paid
resource. Then:

1. Create it in the console of a provider other than production's, in
   another city, with your SSH key for root and a firewall that lets in
   port 443 from anywhere and port 22 from the addresses you work from. Put
   its address in `inventory/hosts.yml`, and its provider and city in
   `group_vars/uptime/main.yml`.
   Give it a name, `uptime_hostname`, with A and AAAA records that Cloudflare
   does not proxy, so it answers even when Cloudflare does not, and the
   status page its own, `uptime_status_hostname` ([The status
   page](#the-status-page)).
2. Make its credentials, which are its own:
   - a Telegram bot from @BotFather, and the chat it writes to, which may be
     the one production's alerts go to;
   - a Cloudflare Access service token (Zero Trust › Access › Service
     credentials), and a Service Auth policy for it on the sandbox's Access
     application.

   Put them in `inventory/group_vars/uptime/vault.yml`, from
   `inventory/vault.uptime.example.yml` and encrypted like the others, or
   write them on the server, as `NAME='value'` lines, after step 3 (the
   folder is the one `uptime.yml` makes, with the same owner and mode):

   ```sh
   ssh -t ops@uptime.peal.social 'sudo install -d -m 750 /srv/uptime && sudo install -m 600 /dev/null /srv/uptime/credentials.env && sudoedit /srv/uptime/credentials.env'
   ```

3. `uv run ansible-playbook playbooks/bootstrap.yml --limit uptime -e ansible_user=root`
4. `uv run ansible-playbook playbooks/uptime.yml --check --diff`, then without
   `--check`. Caddy gets a Let's Encrypt certificate for `uptime_hostname`,
   and `uptime_status_hostname`, through the TLS-ALPN challenge, on port 443
   alone.
5. Give production its heartbeat token, below.

### The heartbeat

Production's Grafana has a rule that always fires, whose notifications go to
the uptime server instead of Telegram, every 5 minutes or so
(`peal-docker/config/production/grafana/alerting/heartbeat.yaml`). When they
stop, Grafana, Prometheus, or the way out is down, so production's own
alerts may not reach anyone either, and the uptime server says so after 15
minutes. Grafana posts them to `peal_heartbeat_url`, a Gatus external
endpoint, with a bearer token that Gatus takes for that endpoint alone.

The token follows the credential rules. The uptime server generates it, once,
in `/srv/uptime/secrets.env` (`PRODUCTION_HEARTBEAT_TOKEN`), and keeps it
there; for production it is a credential an outside service issued,
`PEAL_HEARTBEAT_TOKEN`, which `site.yml` checks by name only. Nothing else
passes between the two servers. Carry it from one to the other through your
own machine:

- into production's vault: read it with
  `ssh ops@uptime.peal.social sudo grep PRODUCTION_HEARTBEAT_TOKEN /srv/uptime/secrets.env`,
  and put the value in `group_vars/production/vault.yml` as
  `PEAL_HEARTBEAT_TOKEN`;
- or on production's server, without showing it: once
  `/srv/peal/credentials.env` lacks the line,

  ```sh
  ssh ops@uptime.peal.social sudo sed -n "s/^PRODUCTION_HEARTBEAT_TOKEN=/PEAL_HEARTBEAT_TOKEN=/p" /srv/uptime/secrets.env \
    | ssh ops@ssh.peal.social 'sudo tee -a /srv/peal/credentials.env > /dev/null'
  ```

Then run `site.yml` on production, which writes the heartbeat's settings to
`host.env`, and `release.yml`, which restarts Grafana with them. To change
the token, delete its line on the uptime server, run `uptime.yml`, which
makes another, and give production the new one.

### The dashboard

Gatus's dashboard listens on the uptime server's 127.0.0.1 only. SSH lets
`ops` forward a local port to it, and to nothing else:

```sh
ssh -N -L 8080:127.0.0.1:8080 ops@uptime.peal.social   # then open http://localhost:8080
```

On `uptime_hostname`, Caddy answers the heartbeats' path and nothing else:
`/api/v1/endpoints/<group>_<name>/external`, by POST, and 404 to the rest.

### The status page

The owner chose to publish the dashboard as Peal's status page, at
<https://status.peal.social>: `uptime_public_status: true` and
`uptime_status_hostname: status.peal.social` in `group_vars/uptime/main.yml`.
On that name, Caddy serves the dashboard and API of a Gatus of its own,
`status`, by GET and HEAD alone, and answers 405 to any other method
(`status.caddy`): the page takes no heartbeat, and the heartbeats keep
`uptime_hostname`, so production's `peal_heartbeat_url` does not change.
That Gatus checks the customer-facing endpoints (site, docs, web app, API)
of the environments `uptime_environments` marks `public` (production
alone; one behind Access cannot be), with no alert and no secret, and shows
no URL, condition or error (`status-config.yaml.j2`). The sandbox, the
certificate and DNS checks and the heartbeats stay on the private
dashboard. The uptime Gatus checks the page's certificate hourly, as it
does `uptime_hostname`'s.

It needs one DNS record in the `peal.social` zone, made before `uptime.yml`
runs, or Caddy gets no certificate for it:

| Type  | Name     | Content              | Proxy status                         |
| ----- | -------- | -------------------- | ------------------------------------ |
| CNAME | `status` | `uptime.peal.social` | DNS only (not proxied by Cloudflare) |

Not proxied, as `uptime_hostname` is: the page then answers even when
Cloudflare does not, and Caddy's TLS-ALPN challenge reaches the server. A
CNAME follows the uptime server's A and AAAA records, so a new address
changes one record. To take the page down, set `uptime_public_status: false`
and run `uptime.yml`; Caddy then serves `uptime_hostname` alone, and the
record can go.

### On the uptime server

| Path                          | What it holds                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `/srv/uptime/compose.yaml`    | The stack: Gatus on 127.0.0.1:8080, Caddy on port 443                            |
| `/srv/uptime/gatus/`          | Gatus's configuration, which holds no secret: Gatus reads them from its settings |
| `/srv/uptime/caddy/`          | Caddy's configuration: the heartbeats' routes, and the status page's             |
| `/srv/uptime/data/`           | Gatus's history, a SQLite database the `gatus` user owns                         |
| `/srv/uptime/status/`         | The status page's Gatus's configuration: public checks alone, no secret          |
| `/srv/uptime/status-data/`    | The status page's history, which the `gatus` user owns                           |
| `/srv/uptime/secrets.env`     | The heartbeat tokens, generated there                                            |
| `/srv/uptime/credentials.env` | What outside services issued: the Telegram bot and the Access service token      |

`uptime-compose` runs Docker Compose on the stack: `sudo uptime-compose ps`,
`sudo uptime-compose logs --tail 50 gatus`.

## Docker Engine

Docker Engine, Compose, containerd and Buildx are installed at the exact
versions `docker_packages` names (`roles/docker/defaults/main.yml`), and an
apt pin holds them there, so neither the daily security updates nor the
system role's upgrade moves them. To bump them, list the versions Docker
publishes for the servers' Ubuntu release, as the comment there shows, put
the new ones in `docker_packages`, read Docker Engine's release notes, then
run `site.yml` with `--check --diff` and apply it on the sandbox, then
production, then the uptime server. The engine restarts, and the containers
with it unless the bump is a patch release, so release in a quiet hour.

## Idempotency

A second run of `site.yml` reports no change:

- Packages, users, keys, files, templates, units and ufw rules declare a
  state, which modules leave alone when it holds. The package upgrade reads
  the cached lists for an hour.
- Templates for sshd, sudoers and cloudflared's routes are validated before
  they replace the live files; `sshd -t` runs again on the whole
  configuration and reports no change.
- The swap file is created only when `/swapfile` is missing, and the secrets
  only when `secrets.env` is (`creates`). The swap file is made under another
  name and renamed once it is a swap area, so a run cut short leaves none
  half made.
- cloudflared's package is downloaded only when its digest differs, and
  installed only when that version is not.
- The credentials check reads names, never values, and changes nothing.
- On the uptime server, a heartbeat token is generated only when
  `secrets.env` lacks it, and Compose recreates a container only when its
  image or its configuration changed, which a label holding its digest
  tells.
- Handlers restart sshd, journald, Docker or cloudflared only after a change;
  cloudflared's restart is scheduled a few seconds out, and Ansible waits for
  its connection, which may run through the tunnel.

`release.yml` changes what a release changes. Run again for the same commit,
it builds and uploads nothing (the images are on the server), creates no
Bluesky key (one is in `secrets.env`), leaves the database password alone
(the server's is accepted, over the network as the server signs in), and
Compose recreates nothing. What it reads of the running containers is their
image and settings' hash, never their environment, which holds secrets.
