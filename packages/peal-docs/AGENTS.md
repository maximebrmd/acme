# Docs

The documentation site (Blume). Where pages go, how tabs and folders are
ordered and how pages move are in the root `AGENTS.md` ("Docs and marketing
site") and DESIGN.md's Docs section. This guide is how a page is written.

## A page

- One task for one reader. The title names the task; `description` is one
  sentence (its line in `llms.txt`); the first paragraph says what the page
  lets the reader do, in one or two sentences.
- English at `docs/`, French at `docs/fr/` under the same path, with the
  same structure: the same headings, anchors (`[#id]`), components and code,
  in the same order. Change both in the same change.
- Every fact stays true: names of buttons, fields, codes, permissions,
  limits and defaults are the app's and the contract's, copied, never
  guessed. Moving a fact into a table or a list keeps it whole.

## Shape the text

Write for someone scanning. A paragraph holds one idea in at most three or
four sentences. Then reach for the component that fits the content, as a
reader expects from API docs:

| Content                                         | Use                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| Steps the reader follows in order               | `<Steps>` with a `<Step title="…">` each                                 |
| Several items of the same kind                  | a list; a table when each item has the same attributes                   |
| Fields, options, settings, codes                | a table (name, values, default, meaning), names in code                  |
| The same task through the API, CLI, MCP or SDKs | `<Tabs>` / `<CodeGroup>` with one tab each: `curl`, the CLI, TypeScript… |
| A request and its answer                        | two fenced blocks with their language (`bash`, `json`, `ts`)             |
| What can go wrong, money, data loss             | `<Callout type="warning">` (`info` for a useful aside), one per idea     |
| Where to go next, landing pages                 | `<CardGroup cols={2}>` of `<Card title href icon>`                       |
| Detail most readers skip (edge cases, limits)   | `<Accordion>` / `<AccordionItem title="…">`, or `<Expandable>`           |
| A prompt for a coding agent or an AI assistant  | `<Prompt>`                                                               |
| A flow between systems                          | a `mermaid` block, when it is shorter than the prose                     |

Fence every code block with its language so it is highlighted. Use Lucide
icon names (`square-pen`, `cable`…) where a component takes an `icon`, the
app's own icon for a page the app has (`peal-web`'s
`components/shell/sidebar-view.tsx`). Every page has a `sidebar.icon`; a
platform's page shows its mark from `public/platform-marks/`, which
`scripts/platform-marks.ts` writes from simple-icons, as the app draws them.

## Plain words

The humanizer rules (github.com/blader/humanizer) apply to every page:

- State the point; no "not X but Y" contrasts, no one-line closers, no
  staged openers ("Here's what you need to know"), no arguing with no one.
- No forced triads, no em or en dashes (use a period, comma, colon or
  parentheses), no stacked qualifiers.
- No inflated words (crucial, robust, seamless, powerful, leverage,
  showcase, key as an adjective) and no sales language.
- Use "is", "has" and "does", not "serves as", "features" or "boasts".
- Bold only for the names of buttons, fields and menus the reader clicks,
  never as a label in front of every list item.
- Sentence case for headings, no emoji, no decoration.
- Never name a competitor or another product than the platforms Peal posts
  to and the tools it integrates.

## Checks

`nx run peal-docs:test` (`blume validate --strict`) fails on a broken link
or anchor. Some tests read pages: the error codes table
(`developers/conventions/errors.mdx`, the section `#error-codes`, a row per
code), the webhook payload examples (`developers/webhooks/events/`, one
` ```json title="<event>" ` block per event type), the table of deletes and
edits (`guides/posts/published.mdx`, under `#unpublish`), the CLI's
`--options` line (`developers/cli/posts.mdx`), the server settings table
(`self-hosting/environment-variables.mdx`, first column under "Server").
Keep each as it is shaped.
