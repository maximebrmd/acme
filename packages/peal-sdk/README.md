# Peal SDKs

Clients for the [Peal API](https://peal.social) in eight languages, generated
from the contract (`packages/peal-contract`) by
[openapi-generator](https://openapi-generator.tech). They are not published
yet.

| Language              | Folder             | Registry      | Install                                                   |
| --------------------- | ------------------ | ------------- | --------------------------------------------------------- |
| TypeScript/JavaScript | [`node`](node)     | npm           | `npm install peal`                                        |
| Python                | [`python`](python) | PyPI          | `pip install peal-sdk` (imported as `peal`)               |
| Go                    | [`go`](go)         | Go modules    | `go get github.com/peal-social/peal/packages/peal-sdk/go` |
| Ruby                  | [`ruby`](ruby)     | RubyGems      | `gem install peal`                                        |
| Java                  | [`java`](java)     | Maven Central | `social.peal:peal`                                        |
| PHP                   | [`php`](php)       | Packagist     | `composer require peal-social/peal`                       |
| .NET                  | [`dotnet`](dotnet) | NuGet         | `dotnet add package Peal`                                 |
| Rust                  | [`rust`](rust)     | crates.io     | `cargo add peal-sdk`                                      |

Each folder's README lists its operations and models.

## What they call

Every operation a bearer token can call: a workspace API key (`peal_…`) or an
OAuth access token, plus the health checks. The operations that answer only
the person in their own session (exporting or deleting an account, connected
applications, deleting a workspace), the staff console, the platforms'
callbacks and the browser's own endpoints are left out. Some operations also
refuse API keys and want a member's token, such as listing members; each one's
description says so.

They send requests to `https://app.peal.social` unless told otherwise: point
them at your own server's address when you self-host.

## How they are made

`bun run sdk:generate` regenerates every SDK, and needs Docker:

1. `peal-sdk:spec` (`scripts/spec.ts`) writes `openapi.json` from the
   contract's: the operations above, the schemas they use, and the license,
   contact and server the packages carry.
2. Each `peal-sdk-<language>:sdk:generate` (`scripts/generate.ts`) deletes the
   files its previous run wrote, runs openapi-generator in Docker, copies
   `LICENSE` in and fills what the generator leaves out of the package's
   manifest (`scripts/finish.ts`).

`scripts/languages.ts` holds each language's generator options, version and
build, and pins every image by digest. Bump a language's version there to
release it.

`bun run sdk:build` builds each SDK as its registry would receive it, then
loads it: TypeScript with the workspace's compiler, Python with uv, the others
in their language's image, as you, with their downloads cached in
`.cache/sdk`. `bun run sdk:check` regenerates every SDK and fails when the
result differs from the repository, as CI does.

Never edit a generated file: change the contract, the scripts or the
generator's options, and regenerate. The files a folder's
`.openapi-generator-ignore` names are ours, and the generator leaves them
alone.

## License

The SDKs are licensed under the [Apache License 2.0](LICENSE), unlike the rest
of this repository, which is under the Functional Source License: use them in
any project, commercial or not.
