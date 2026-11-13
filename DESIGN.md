# Peal design

How Peal looks and is laid out: the web app first, and the site and the docs
after it. `packages/peal-ui/src/styles/globals.css` carries these values as
tokens; change both together. Contributors and agents read this before
changing a screen.

## Light only

Peal has one theme, light. There is no dark mode yet, so no screen follows
the operating system's setting and none offers a switch:

- peal-ui sets `color-scheme: light` and defines no dark tokens. Its `dark:`
  variant matches a `.dark` class that nothing sets, so the `dark:` classes
  shadcn/ui's components bring with them stay inert.
- Write no `dark:` class in Peal's own code, in the web app or the site.
- The docs set Blume's `theme.mode` to `light`, without its toggle.

## Colour

### Brand

The three colours of the mark (`packages/peal-web/src/app/icon.svg`):

| Name     | Value     | Use                                                          |
| -------- | --------- | ------------------------------------------------------------ |
| Blue     | `#415EEE` | The accent: links, focus rings, selection, today, scheduled. |
| Lavender | `#B9A6FF` | Illustration and fills only.                                 |
| Yellow   | `#FFCA00` | Illustration, highlights and the needs-approval dot.         |

Blue is the only colour that carries meaning on its own. Lavender (2.1:1)
and yellow (1.5:1) fail contrast on white: never use them for text, for
icons or for a line that must be seen. For text on their tints, use these
pairs:

| Tint      | Text      | Contrast |
| --------- | --------- | -------- |
| `#E8ECFD` | `#2F47C9` | 6.2:1    |
| `#EDE7FF` | `#5B45C7` | 5.6:1    |
| `#FFF4CC` | `#7A5B00` | 5.7:1    |

Blue's hover is `#2F47C9`, its pressed state `#22339A`. White on blue is
5.2:1.

### Neutrals

Warm greys (stone), from the page out:

| Token                | Value     | Use                                                 |
| -------------------- | --------- | --------------------------------------------------- |
| `background`         | `#FAFAF9` | The page, the sidebar and the top bar.              |
| `card`, `popover`    | `#FFFFFF` | Tables, cards, menus, dialogs, inputs.              |
| `muted`, `secondary` | `#F5F5F4` | Code blocks, prompts, quiet fills.                  |
| `accent`             | `#EFEEEC` | Hover, and the current item in the sidebar.         |
| `border`             | `#E7E5E4` | Every border and divider.                           |
| `input`              | `#D6D3D1` | The border of a field.                              |
| `foreground`         | `#0C0A09` | Headings and body text.                             |
| `muted-foreground`   | `#716B66` | Secondary text and placeholders (4.8:1 on `muted`). |

`primary` is the ink, `#0C0A09` with `#FAFAF9` on it: the main action of a
page is a black button. Blue is for what is selected or links somewhere,
not for buttons.

### States

A post's state has a colour, and nothing else in a list does. Each pairs a
dot, a tint and a text colour:

| State          | Dot       | Tint      | Text      |
| -------------- | --------- | --------- | --------- |
| Scheduled      | `#415EEE` | `#F2F4FE` | `#2F47C9` |
| Published      | `#16A34A` | `#F0FDF4` | `#166534` |
| Needs approval | `#E0A800` | `#FFFBEB` | `#92400E` |
| Failed         | `#D92D20` | `#FDECEC` | `#B42318` |
| Draft          | `#A8A29E` | `#F5F5F4` | `#44403C` |

`destructive` is `#D92D20` (white on it is 4.8:1); `destructive-text`,
`#B42318`, is for text on its tint. States that must be told apart also
differ in lightness, not hue alone.

## Type

Geist for text and Geist Mono for what is read character by character: ids,
slugs, keys, times, counts, code and keyboard shortcuts. peal-ui ships both
(`peal-ui/lib/fonts`); the docs name `geist` and `geist-mono` in Blume.

| Role            | Size | Weight | Notes                                             |
| --------------- | ---- | ------ | ------------------------------------------------- |
| Home headline   | 30   | 600    | Two lines, the second in muted text.              |
| Page title      | 24   | 600    | Only where a page has no toolbar.                 |
| Section heading | 15   | 600    |                                                   |
| Body, controls  | 14   | 400    | 500 for the current item and labels.              |
| Secondary       | 13   | 400    | Hints, cells' second line.                        |
| Small           | 12   | 400    | Table headers (upper case), group labels, badges. |

Numbers that line up use `tabular-nums`. Letter spacing is `-0.025em` at
24 px and above, none below.

## Shape and space

- A 4 px grid. Pages have 16 px of padding inside the content area; cards
  16 to 18 px.
- Radius: 6 px for controls, cards, tables and menus; 4 px for chips,
  badges and keys; full for avatars and dots.
- Borders before shadows. A shadow lifts only what floats: menus,
  popovers, dialogs, the selected segment of a switch.
- Heights: controls 34 px (30 small, 38 for a toolbar's search); sidebar
  rows 34; table rows about 44; the top bar 56.

## Icons

lucide, at 16 px in navigation and buttons (stroke 1.75) and 12 to 14 px in
chips (stroke 2), in `currentColor`. An icon-only button has an
`aria-label`. Platforms are shown by their own marks where they allow it,
else by a lettered tile; never draw a platform's logo from memory.

## The frame

Every signed-in page has the same frame:

- **Sidebar**, 240 px, on `background`, with a border on its right:
  - At the top, the **mode switch**, with the Peal mark inside it: Studio,
    for running a workspace's channels, and Console, for building on the
    API. The mark and the two modes share one frame; switching is one
    click, never a menu. The mark's tile is white in Studio and ink in
    Console, so the mode shows at a glance. Each page belongs to one mode,
    so the address carries it; switching opens the other mode's first page
    the member may open, and a mode with none is shown disabled.
  - The mode's navigation, in groups with a small label, listing only the
    pages the member's permissions open. A section with pages of its own
    (Posts and Settings today) shows a chevron and **drills down**: on its
    pages, the sidebar shows that section's pages under a back link.
  - Settings at the foot, then the workspace switcher.
- **Top bar**, 56 px, aligned with the sidebar's top: the menu button on a
  phone, the breadcrumb (with a count in Geist Mono where a page has one),
  then search (`⌘K`, once there is search), Docs and
  Support.
- **Content** on `background`, in white cards and tables. Full-bleed tools
  (the calendar, the inbox, the composer) are white edge to edge.

Studio holds Home, Calendar, Posts, Channels and Media, then Inbox,
Analytics and Ads under Engage. Console holds Platforms, then API keys and
Webhooks under Build, and Partner under Partners; a page the API offers
later (connect links, activity, usage, OAuth apps) joins it there. The
person's own pages, outside any workspace (the overview, the agenda, the
report, the notices, the account), have a sidebar of their own, with
their workspaces under it.

## Pages

- **Lists** lead with their toolbar: search, filter menus, sort, the view,
  then the page's main action on the right. A full-width table follows.
  Each row opens what it shows, with a chevron at its end.
- **Empty states** say what will appear and give the one next step.
- **Errors** name the cause and carry the fix beside it (crop, reconnect,
  review).
- **Settings** are rows: label and hint on the left, the control on the
  right, in cards grouped under a heading, with what cannot be undone last.
- **The composer** writes one text with a tab per channel, counts each
  platform's limit, and shows a preview beside it.

## Writing

Sentence case everywhere. Buttons say what they do ("Connect a channel",
"Create key"). Say what happened and what to do next; no exclamation marks
and no emoji in the interface.
