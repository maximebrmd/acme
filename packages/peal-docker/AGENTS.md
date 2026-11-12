# Compose files and telemetry

Running the development stack is in the root [`AGENTS.md`](../../AGENTS.md),
under Development stack.

## Compose files

- In `packages/peal-docker/compose.yaml`, pin every image to an exact
  version, publish ports on 127.0.0.1 only, give every service a health
  check, and use synthetic credentials.
  `packages/peal-docker/test/compose.test.ts` enforces these rules, and checks
  that the server image uses the Bun in `.bun-version`, runs as nonroot, ships
  ffprobe, and pins every image it builds on or copies from by digest.
- Mount no image (`type: image`): Docker mounts the image when it creates
  the container and not again after its daemon restarts (a reboot, an engine
  upgrade), so the container restarts on an empty folder. A binary an image
  lacks, such as the collector's health-check wget, comes from a one-shot
  service that copies it into a named volume the service mounts read-only
  and waits for (`condition: service_completed_successfully`). A one-shot
  service has no health check, and in production `restart: "no"` and
  `network_mode: none`.
- `compose.production.yaml` follows the same rules, pins every image it pulls
  by digest at the version `compose.yaml` runs, gives every long-running service
  `restart: unless-stopped` and the server `stop_grace_period: 75s`, and tags
  the images it builds `${PEAL_VERSION:-local}` (`PEAL_POSTGRES_VERSION` for
  Postgres). It passes optional settings through by name (`NAME:` with no
  value), so one that is unset stays unset rather than empty, which the
  server would read as set, and names every server setting the docs'
  environment variables page lists: a container sees no other. Every service
  runs `read_only` with `no-new-privileges`, writing to its volumes and tmpfs
  mounts only. The same test covers it, the web, static and
  Postgres images (CI's Node, the workspace's Bun, digests, nonroot) and
  `compose.self-host.yaml`, where Caddy alone publishes ports to the world.
- Keep `MP_SMTP_DISABLE_RDNS` on Mailpit, in compose and CI: its reverse DNS
  lookup otherwise stalls each SMTP greeting for about 10 seconds, and the
  email tests time out.

## Telemetry and alerting

- Telemetry goes through an OpenTelemetry Collector to Loki, Tempo, Prometheus
  and Grafana; alerts go to a Telegram bot. Grafana's alert rules
  (`config/production/grafana/alerting/rules.yaml`) and dashboards
  (`config/production/grafana/dashboards/`) are provisioned from
  `peal-docker`; the web app's error reports have an alert and a dashboard
  of their own, and the server's error-log alert leaves them out. The
  heartbeat rule (`alerting/heartbeat.yaml`) is apart: it always fires, to
  its own contact point, never to Telegram.
- The backup and disk rules read gauges the host posts to the collector
  (the Ansible roles `peal_backup` and `peal_disks`), not the stack's own
  telemetry. A self-hoster's server without those roles never posts them:
  `peal-raid-degraded` and `peal-disk-failing` take no data as `OK`, and
  read the names the role's script posts, which
  `packages/peal-infra/ansible/tests/test_disks.py` ties to the rules.
- Telemetry keeps logs 31 days (Loki), traces 14 days
  (`config/production/tempo.yaml`, whose `block_retention` is set for both
  the backend scheduler and worker) and metrics 30 days, as the privacy
  policy says: change both together.
