# Infrastructure

Peal's own infrastructure, one project per tool, each with its own
toolchain, tests and guide:

| Folder                         | Nx project           | What it does                                                                                                     |
| ------------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [`ansible`](ansible/README.md) | `peal-infra-ansible` | Configures Peal's servers (production, the sandbox, the uptime server) and releases a commit to them. Python, uv |

Self-hosters need none of it: Caddy and Compose are enough (the docs'
self-hosting page, and [`peal-docker`](../peal-docker)).
