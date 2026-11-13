# Infrastructure

Peal's own infrastructure, one project per tool, each with its own
toolchain, tests and guide. Pulumi makes what lives at Cloudflare, then
Ansible configures the servers behind it:

| Folder                         | Nx project           | What it does                                                                                                                |
| ------------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`ansible`](ansible/README.md) | `peal-infra-ansible` | Configures Peal's servers (production, the sandbox, the uptime server) and releases a commit to them. Python, uv            |
| [`pulumi`](pulumi/README.md)   | `peal-infra-pulumi`  | Keeps what Peal has at Cloudflare as code: Access, tunnels and their host names, R2 buckets, Email Routing. TypeScript, Bun |

Self-hosters need none of it: Caddy and Compose are enough (the docs'
self-hosting page, and [`peal-docker`](../peal-docker)).
[`DEPLOYMENT.md`](DEPLOYMENT.md) describes what runs where: the servers,
releases, backups, alerts and the uptime server.
