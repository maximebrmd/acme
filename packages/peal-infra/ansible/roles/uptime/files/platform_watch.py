#!/usr/bin/python3
"""Watches the platforms' changelog pages and feeds, and posts what changed
to a Slack channel through an incoming webhook.

Managed by Ansible (peal-infra, the uptime role), which installs it as
peal-platform-watch and runs it from a systemd timer, as the gatus user.
Standard library only: the uptime server installs nothing for it.

Each source is a page, whose readable text is compared with the copy kept
from the last run, or a feed (RSS 2.0 or Atom), whose new items are posted.
A source's first run keeps a copy and posts nothing. A source that fails
BROKEN_AFTER runs in a row posts that it is broken, once, and once more when
it works again. One source that fails never stops the others.

The webhook's URL comes from the environment (SLACK_CHANGELOG_WEBHOOK_URL),
never from the command line, and is never printed.
"""

from __future__ import annotations

import argparse
import difflib
import gzip
import hashlib
import html
import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ElementTree
import zlib
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Callable

USER_AGENT = "peal-platform-watch/1 (+https://peal.social)"
TIMEOUT_SECONDS = 30
MAX_BYTES = 8 * 1024 * 1024
BROKEN_AFTER = 3
DIFF_LINES = 15
LINE_CHARS = 200
FEED_ITEMS = 10
SEEN_KEPT = 1000
WEBHOOK_VARIABLE = "SLACK_CHANGELOG_WEBHOOK_URL"
KINDS = ("page", "feed")


@dataclass(frozen=True)
class Source:
    name: str
    platform: str
    url: str
    kind: str

    @property
    def key(self) -> str:
        """The name of the source's state file: its kind and URL, so a
        source renamed keeps its copy and one whose URL changes starts
        anew."""
        digest = hashlib.sha256(f"{self.kind} {self.url}".encode()).hexdigest()
        return digest[:24]


class FetchError(Exception):
    """A source that could not be read this run, with a short reason fit
    for a Slack message: no page content, no URL query."""


# --- Pages -------------------------------------------------------------------

# Never text: code, styles, and the parts every page of a site repeats.
_SKIPPED = frozenset(
    {
        "head",
        "title",
        "script",
        "style",
        "noscript",
        "template",
        "svg",
        "iframe",
        "canvas",
        "nav",
        "header",
        "footer",
        "aside",
        "form",
        "button",
        "select",
        "dialog",
    }
)
# Elements a page puts no closing tag on.
_VOID = frozenset(
    {
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
    }
)
# Elements that end a line of text.
_BLOCKS = frozenset(
    {
        "address",
        "article",
        "blockquote",
        "br",
        "dd",
        "details",
        "div",
        "dl",
        "dt",
        "figcaption",
        "figure",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "hr",
        "li",
        "main",
        "ol",
        "p",
        "pre",
        "section",
        "summary",
        "table",
        "td",
        "th",
        "tr",
        "ul",
    }
)
# The page's own content, by preference: the first of these the page has.
_CONTENT = ("main", "article")
# Roles that mark the same parts as the skipped elements.
_SKIPPED_ROLES = frozenset({"navigation", "banner", "contentinfo", "search", "complementary"})


class _TextExtractor(HTMLParser):
    """The readable text of an HTML page, one line per block, in three
    buffers: inside <main>, inside <article>, and the whole body; and the
    JSON its scripts carry (type="application/json"), where a page rendered
    on the server by a script framework may keep its text alone. Content a
    page streams in a hidden element, to move it in place later, counts as
    the body's."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.json_scripts: list[str] = []
        self.json_buffer: list[str] | None = None
        self.stack: list[tuple[str, bool]] = []
        self.skipping = 0
        self.inside = {name: 0 for name in _CONTENT}
        self.buffers: dict[str, list[str]] = {name: [] for name in (*_CONTENT, "body")}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag in _VOID:
            if tag in _BLOCKS:
                self._write("\n")
            return
        attributes = dict(attrs)
        if tag == "script" and (attributes.get("type") or "").lower() == "application/json":
            self.json_buffer = []
        skipped = (
            tag in _SKIPPED
            or (attributes.get("role") or "").lower() in _SKIPPED_ROLES
            or (attributes.get("aria-hidden") or "").lower() == "true"
        )
        self.stack.append((tag, skipped))
        if skipped:
            self.skipping += 1
        if tag in self.inside:
            self.inside[tag] += 1
        if tag in _BLOCKS:
            self._write("\n")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in _BLOCKS:
            self._write("\n")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "script" and self.json_buffer is not None:
            self.json_scripts.append("".join(self.json_buffer))
            self.json_buffer = None
        if tag in _VOID or not any(open_tag == tag for open_tag, _ in self.stack):
            return
        # Close what the page left open inside this element too.
        while self.stack:
            open_tag, skipped = self.stack.pop()
            if skipped:
                self.skipping -= 1
            if open_tag in self.inside:
                self.inside[open_tag] -= 1
            if open_tag in _BLOCKS:
                self._write("\n")
            if open_tag == tag:
                break

    def handle_data(self, data: str) -> None:
        if self.json_buffer is not None:
            self.json_buffer.append(data)
        # A line break in the source is a space, but in preformatted text.
        if not any(open_tag == "pre" for open_tag, _ in self.stack):
            data = re.sub(r"\s+", " ", data)
        self._write(data)

    def _write(self, text: str) -> None:
        if self.skipping:
            return
        self.buffers["body"].append(text)
        for name, depth in self.inside.items():
            if depth:
                self.buffers[name].append(text)


# Lines made of nothing but what changes on every build or visit: a date or a
# time, a long hexadecimal or base64-looking token, a counter of views.
_VOLATILE = re.compile(
    r"""^(
        (last\s+)?(updated|modified|generated|built|published)(\s+on)?:?\s*.{0,40}\d.{0,40}
      | [0-9a-f]{16,}
      | [A-Za-z0-9+/_=-]{32,}
      | \d{1,4}([-/.:\sT]\d{1,4}){1,6}(\s*(Z|UTC|GMT|[AP]M|[+-]\d{2}:?\d{2}))?
      | [\d,.]+\s+(views?|reads?)
    )$""",
    re.IGNORECASE | re.VERBOSE,
)


def normalise(text: str) -> list[str]:
    """Lines of text with their whitespace collapsed, blank and volatile
    lines dropped."""
    lines = []
    for line in text.splitlines():
        collapsed = " ".join(line.split())
        if collapsed and not _VOLATILE.match(collapsed):
            lines.append(collapsed)
    return lines


# A server-rendered element tree's elements that end a line, by the end of
# their type's name: paragraphs, headings, list items, table cells and rows,
# blocks of code.
_TREE_BLOCK = re.compile(r"(P|H[1-6]|Heading|Li|Item|Td|Th|Tr|Row|Cell|Table|Pre|CodeBlock|Callout|Note)$")


def _tree_lines(value: Any, lines: list[str], depth: int = 0) -> None:
    """The text of the element trees in a page's JSON: objects with a type
    and a list of children, whose strings are the text. JSON held in a
    string is read too. Other strings (identifiers, settings, tokens) are
    never text."""
    if depth > 200:
        return
    if isinstance(value, dict):
        if isinstance(value.get("type"), str) and isinstance(value.get("children"), list):
            text: list[str] = []
            _render_tree(value, text, lines, depth)
            _flush(text, lines)
            return
        for child in value.values():
            _tree_lines(child, lines, depth + 1)
    elif isinstance(value, list):
        for child in value:
            _tree_lines(child, lines, depth + 1)
    elif isinstance(value, str) and value[:1] in "{[":
        try:
            _tree_lines(json.loads(value), lines, depth + 1)
        except ValueError:
            pass


def _render_tree(node: dict[str, Any], text: list[str], lines: list[str], depth: int) -> None:
    for child in node["children"]:
        if isinstance(child, str):
            text.append(child)
        elif isinstance(child, dict) and isinstance(child.get("children"), list) and depth < 200:
            block = bool(_TREE_BLOCK.search(str(child.get("type", ""))))
            if block:
                _flush(text, lines)
            _render_tree(child, text, lines, depth + 1)
            if block:
                _flush(text, lines)


def _flush(text: list[str], lines: list[str]) -> None:
    joined = " ".join("".join(text).split())
    if joined:
        lines.append(joined)
    text.clear()


def page_text(document: str) -> list[str]:
    """The readable lines of an HTML page: its <main>, or else its
    <article>, or else the element trees its JSON scripts carry, or else its
    body, without scripts, styles, navigation, headers, footers or the
    parts it hides from assistive technology."""
    parser = _TextExtractor()
    parser.feed(document)
    parser.close()
    for name in _CONTENT:
        lines = normalise("".join(parser.buffers[name]))
        if lines:
            return lines
    tree: list[str] = []
    for script in parser.json_scripts:
        try:
            _tree_lines(json.loads(script), tree)
        except ValueError:
            continue
    lines = normalise("\n".join(tree))
    if lines:
        return lines
    return normalise("".join(parser.buffers["body"]))


def _clip(line: str) -> str:
    return line if len(line) <= LINE_CHARS else line[: LINE_CHARS - 1] + "…"


def changed_lines(before: list[str], after: list[str], limit: int = DIFF_LINES) -> tuple[list[str], int]:
    """The lines added and removed between two copies of a page, as a
    unified diff marks them (+ and -), at most limit of them, each clipped,
    and how many more there were."""
    marked = [
        line
        for line in difflib.unified_diff(before, after, lineterm="", n=0)
        if line[:1] in "+-" and not line.startswith(("+++", "---"))
    ]
    return [_clip(line) for line in marked[:limit]], max(0, len(marked) - limit)


# --- Feeds -------------------------------------------------------------------

_ATOM = "{http://www.w3.org/2005/Atom}"


@dataclass(frozen=True)
class Item:
    id: str
    title: str
    link: str


def _text(element: ElementTree.Element | None) -> str:
    if element is None:
        return ""
    return " ".join("".join(element.itertext()).split())


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def feed_items(document: bytes) -> list[Item]:
    """The items of an RSS 2.0 or Atom feed, in the feed's order. An
    item's id is its guid or Atom id, else its link, else its title."""
    try:
        root = ElementTree.fromstring(document)
    except ElementTree.ParseError as error:
        raise FetchError(f"not a feed: {error}") from None
    items: list[Item] = []
    if _local(root.tag) == "rss" or root.find("channel") is not None:
        for entry in root.iter("item"):
            link = _text(entry.find("link"))
            title = _text(entry.find("title"))
            items.append(Item(id=_text(entry.find("guid")) or link or title, title=title, link=link))
    elif root.tag == f"{_ATOM}feed":
        for entry in root.iter(f"{_ATOM}entry"):
            links = entry.findall(f"{_ATOM}link")
            alternate = next(
                (link for link in links if link.get("rel", "alternate") == "alternate"),
                links[0] if links else None,
            )
            link = (alternate.get("href") or "").strip() if alternate is not None else ""
            title = _text(entry.find(f"{_ATOM}title"))
            items.append(Item(id=_text(entry.find(f"{_ATOM}id")) or link or title, title=title, link=link))
    else:
        raise FetchError(f"not an RSS or Atom feed: <{_local(root.tag)}>")
    return [item for item in items if item.id]


# --- Fetching and posting ----------------------------------------------------


def _decode(body: bytes, encoding: str) -> bytes:
    encoding = encoding.strip().lower()
    if encoding in ("", "identity"):
        return body
    if encoding in ("gzip", "x-gzip"):
        return gzip.decompress(body)
    if encoding == "deflate":
        try:
            return zlib.decompress(body)
        except zlib.error:
            return zlib.decompress(body, -zlib.MAX_WBITS)
    raise FetchError(f"unknown content encoding {encoding}")


def fetch(url: str) -> tuple[bytes, str]:
    """A source's body, decompressed, and its charset; redirects are
    followed. Raises FetchError with a short reason."""
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Encoding": "gzip",
            "Accept-Language": "en",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = response.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                raise FetchError(f"larger than {MAX_BYTES // (1024 * 1024)} MB")
            charset = response.headers.get_content_charset() or "utf-8"
            return _decode(body, response.headers.get("Content-Encoding", "")), charset
    except urllib.error.HTTPError as error:
        raise FetchError(f"HTTP {error.code}") from None
    except urllib.error.URLError as error:
        raise FetchError(f"unreachable: {error.reason}") from None
    except TimeoutError:
        raise FetchError("timed out") from None
    except (OSError, EOFError, zlib.error, ValueError) as error:
        raise FetchError(f"unreadable: {error.__class__.__name__}") from None


def _escape(text: str) -> str:
    """Text as Slack's mrkdwn shows it, without links or mentions."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _link(url: str, label: str) -> str:
    return f"<{url.replace('|', '%7C').replace('>', '%3E')}|{_escape(label)}>"


def post(webhook: str, text: str) -> bool:
    """Posts a message to the Slack webhook; whether Slack took it. The
    webhook's URL never reaches the output."""
    body = json.dumps({"text": text, "unfurl_links": False, "unfurl_media": False}).encode()
    request = urllib.request.Request(
        webhook,
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            return 200 <= response.status < 300
    except urllib.error.HTTPError as error:
        print(f"Slack refused a message: HTTP {error.code}", file=sys.stderr)
    except (urllib.error.URLError, OSError) as error:
        print(f"Slack is unreachable: {error.__class__.__name__}", file=sys.stderr)
    return False


# --- Messages ----------------------------------------------------------------


def page_message(source: Source, added_removed: list[str], more: int) -> str:
    lines = [f"*{_escape(source.platform)}*: {_link(source.url, source.name)} changed"]
    if added_removed:
        block = "\n".join(line.replace("```", "'''") for line in added_removed)
        lines.append(f"```\n{_escape(block)}\n```")
    if more:
        lines.append(f"…and {more} more changed line{'s' if more != 1 else ''}.")
    return "\n".join(lines)


def item_message(source: Source, item: Item) -> str:
    title = item.title or item.link or item.id
    target = item.link if item.link.startswith(("http://", "https://")) else source.url
    return f"*{_escape(source.platform)}* · {_escape(source.name)}: {_link(target, title)}"


def broken_message(source: Source, reason: str) -> str:
    return f"watch broken: {_escape(source.name)} ({_escape(reason)}) {_link(source.url, source.platform)}"


def recovered_message(source: Source) -> str:
    return f"watch recovered: {_escape(source.name)} {_link(source.url, source.platform)}"


# --- State and runs ----------------------------------------------------------


def load_sources(path: Path) -> list[Source]:
    raw = json.loads(path.read_text())
    if not isinstance(raw, list):
        raise SystemExit(f"{path}: a list of sources")
    sources = []
    for entry in raw:
        if not isinstance(entry, dict) or not all(isinstance(entry.get(field), str) for field in ("name", "platform", "url", "kind")):
            raise SystemExit(f"{path}: each source has a name, a platform, a URL and a kind")
        if entry["kind"] not in KINDS or not entry["url"].startswith(("https://", "http://")):
            raise SystemExit(f"{path}: {entry['name']} needs an http(s) URL and a kind, page or feed")
        sources.append(Source(entry["name"], entry["platform"], entry["url"], entry["kind"]))
    return sources


def _read_state(path: Path) -> dict[str, Any]:
    try:
        state = json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
    return state if isinstance(state, dict) else {}


def _write_state(path: Path, state: dict[str, Any]) -> None:
    descriptor, temporary = tempfile.mkstemp(dir=path.parent, prefix=".", suffix=".tmp")
    with os.fdopen(descriptor, "w") as handle:
        json.dump(state, handle, ensure_ascii=False)
    os.chmod(temporary, 0o600)
    os.replace(temporary, path)


Fetcher = Callable[[str], tuple[bytes, str]]
Poster = Callable[[str], bool]


def check(source: Source, state: dict[str, Any], fetcher: Fetcher, poster: Poster) -> tuple[dict[str, Any], bool]:
    """One run of one source: its new state, and whether every message it
    had was posted. The state moves on only once its messages are posted,
    so a message Slack did not take is sent again next run."""
    try:
        body, charset = fetcher(source.url)
        if source.kind == "page":
            content: list[str] | list[Item] = page_text(body.decode(charset, errors="replace"))
            if not content:
                raise FetchError("no readable text")
        else:
            content = feed_items(body)
    except FetchError as error:
        return _failed(source, state, str(error), poster)
    except Exception as error:  # One source never stops the run.
        return _failed(source, state, f"failed: {error.__class__.__name__}", poster)

    messages = []
    if state.get("broken"):
        messages.append(recovered_message(source))
    new_state: dict[str, Any] = {"kind": source.kind, "failures": 0, "broken": False}
    if source.kind == "page":
        lines = content
        new_state["lines"] = lines
        if "lines" in state and state["lines"] != lines:
            added_removed, more = changed_lines(state["lines"], lines)
            messages.append(page_message(source, added_removed, more))
    else:
        items = content
        seen = list(state.get("seen", []))
        if "seen" in state:
            fresh = [item for item in items if item.id not in seen]
            # Oldest first, as people read a channel.
            for item in reversed(fresh[:FEED_ITEMS]):
                messages.append(item_message(source, item))
            if len(fresh) > FEED_ITEMS:
                messages.append(f"…and {len(fresh) - FEED_ITEMS} more in {_link(source.url, source.name)}.")
        known = set(seen)
        new_state["seen"] = ([item.id for item in items if item.id not in known] + seen)[:SEEN_KEPT]

    for message in messages:
        if not poster(message):
            return state, False
    return new_state, True


def _failed(source: Source, state: dict[str, Any], reason: str, poster: Poster) -> tuple[dict[str, Any], bool]:
    new_state = dict(state)
    new_state["failures"] = int(state.get("failures", 0)) + 1
    new_state["reason"] = reason
    print(f"{source.name}: {reason} ({new_state['failures']} in a row)")
    if new_state["failures"] >= BROKEN_AFTER and not state.get("broken"):
        if not poster(broken_message(source, reason)):
            return new_state, False
        new_state["broken"] = True
    return new_state, True


def run(sources: list[Source], state_dir: Path, fetcher: Fetcher, poster: Poster) -> bool:
    """One run of every source; whether every message was posted."""
    all_posted = True
    for source in sources:
        path = state_dir / f"{source.key}.json"
        state = _read_state(path)
        if state.get("kind") not in (None, source.kind):
            state = {}
        new_state, posted = check(source, state, fetcher, poster)
        all_posted = all_posted and posted
        if new_state != state:
            _write_state(path, new_state)
        first = "lines" not in state and "seen" not in state and ("lines" in new_state or "seen" in new_state)
        print(f"{source.name}: {'baseline kept' if first else 'checked'}")
    return all_posted


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--sources", type=Path, required=True, help="the JSON list of sources")
    parser.add_argument("--state", type=Path, required=True, help="the folder that keeps each source's copy")
    arguments = parser.parse_args(argv)

    webhook = os.environ.get(WEBHOOK_VARIABLE, "")
    if urllib.parse.urlsplit(webhook).scheme not in ("https", "http"):
        print(f"Set {WEBHOOK_VARIABLE} to the Slack webhook's URL.", file=sys.stderr)
        return 2
    sources = load_sources(arguments.sources)
    arguments.state.mkdir(mode=0o700, exist_ok=True)
    posted = run(sources, arguments.state, fetch, lambda text: post(webhook, text))
    return 0 if posted else 1


if __name__ == "__main__":
    sys.exit(main())
