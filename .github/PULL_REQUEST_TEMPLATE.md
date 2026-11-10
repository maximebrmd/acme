<!--
  Thanks for contributing to Peal! Please read the contributing guide first:
  https://github.com/peal-social/peal/blob/main/.github/CONTRIBUTING.md

  The title follows Conventional Commits, as what the change does:
  "fix(publishing): keep a post's time zone when it moves on the calendar".
-->

## Summary

<!-- What does this change, and why? Give reviewers the context they need. -->

## Related issues

<!-- "Closes #123" closes the issue when this merges. "Refs #123" only links it. -->

Closes #

## Type of change

- [ ] Bug fix (a change that fixes an issue without breaking anything)
- [ ] New feature (a change that adds functionality without breaking anything)
- [ ] Breaking change (the API, an SDK, a setting or stored data no longer behaves as before)
- [ ] Platform integration (a social platform's publishing, connection, analytics or inbox)
- [ ] Documentation
- [ ] Refactor, tests, tooling or dependencies

## How it was tested

<!--
  The tests you added or changed, and what you checked by hand: the steps,
  the platform and account type, the browser. Say what you could not test.
-->

## Screenshots

<!-- For a change on screen: before and after, in English and in French when text changed. Delete if not applicable. -->

| Before | After |
| ------ | ----- |
|        |       |

## Checklist

- [ ] I read the [contributing guide](https://github.com/peal-social/peal/blob/main/.github/CONTRIBUTING.md) and the `AGENTS.md` of the code I changed
- [ ] `bun run check`, `bun run typecheck`, `bun run test` and `bun run build` pass locally
- [ ] I added or updated tests that prove the fix works or the feature does what it says
- [ ] I ran `nx run peal-e2e:e2e`, or this change does not touch the pages it visits
- [ ] I updated the docs, in English and in French, including new environment variables
- [ ] If the contract changed, I regenerated the SDKs (`bun run sdk:generate`, `bun run sdk:build`)
- [ ] If the database changed, I added a migration (`nx run peal-server:db:generate`)
- [ ] No secrets, real accounts, personal data or other products' names in the code, tests or screenshots

<!--

  Peal's maintainers can delete or ignore the following.

-->

### Legal Boilerplate

Look, I get it. Peal, the licensor named in this repository's licences, is gonna need some rights from me in order to utilize my contributions in this here PR. So here's the deal: I retain all rights, title and interest in and to my contributions, and by keeping this boilerplate intact I confirm that Peal can use, modify, copy, and redistribute my contributions, under Peal's choice of terms.
