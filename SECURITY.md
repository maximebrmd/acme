# Security

## Reporting Security Issues

If you've found a security issue in Peal or in our SDKs, please report it
privately, never in a public issue or pull request:

- through GitHub's
  [private vulnerability reporting](https://github.com/peal-social/peal/security/advisories/new),
  or
- by email to `security[@]peal.social`.

Please include as much information as possible in your report to better help
us understand and resolve the issue:

- Where the security issue exists (i.e. peal.social, a self-hosted instance,
  an SDK, the command line, the Docker images, infrastructure, etc.)
- The type of issue (e.g. missing authorization, access to another
  workspace, exposure of a connected account's tokens, server-side request
  forgery, cross-site scripting, SQL injection, etc.)
- Full paths or links to the source files where the security issue exists, if
  possible
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof of concept or exploit code, if available

Use test accounts and synthetic data, and stop if you reach someone else's
data. We acknowledge each report, keep you informed while we fix it, and
credit you in the published advisory unless you ask us not to.

## Supported Versions

Peal has not been released yet: security fixes land on `main`, and in a new
release of each affected SDK.

## Example and Sample Code

> [!WARNING]
> Unless otherwise specified, example and sample code in this repository
> (fixtures, examples in the docs, `.env.example` files) is unmaintained. It may
> contain insecure values, should never be used in production, and exists only
> for illustrative purposes.
