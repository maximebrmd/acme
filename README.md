# Acme

Schedule social media posts across platforms, from one place. "Acme" is a
working name.

Acme is fair source: you may use, modify and self-host it under the
[Functional Source License](LICENSE.md), and each release becomes Apache-2.0
two years after it ships.

## Develop

You need Bun (the version in [`.bun-version`](.bun-version)), Node 26 and Git.

```sh
bun install --frozen-lockfile
bun run references   # clone framework sources into .local/references
bun nx run acme-server:dev
```

The server listens on <http://localhost:3000> (`PORT` changes it) and serves
its OpenAPI document at `/openapi.json`.

## Verify

```sh
bun run check       # oxlint and oxfmt
bun run typecheck
bun run test
```

## Layout

| Package                                   | What it is                                                   |
| ----------------------------------------- | ------------------------------------------------------------ |
| [`acme-contract`](packages/acme-contract) | The HTTP API definition shared by the server and its clients |
| [`acme-server`](packages/acme-server)     | The Effect server                                            |

How the code is organised, and the rules it follows, are in
[AGENTS.md](AGENTS.md).
