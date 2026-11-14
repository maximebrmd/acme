"""The platform watch (roles/uptime/files/platform_watch.py): the text it
reads from a page, what it posts when a page or a feed changes, its first
run's silence, and its notices of a broken source. Pages and feeds are
synthetic and served from this machine; nothing here reaches the internet,
or Slack."""

from __future__ import annotations

import gzip
import http.server
import importlib.util
import json
import os
import stat
import subprocess
import sys
import threading
from collections.abc import Iterator
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

from conftest import INFRA

SCRIPT = INFRA / "roles" / "uptime" / "files" / "platform_watch.py"


def _load() -> ModuleType:
    spec = importlib.util.spec_from_file_location("platform_watch", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules["platform_watch"] = module
    spec.loader.exec_module(module)
    return module


watch = _load()

PAGE = """<!doctype html>
<html><head><title>Changelog | Example Developers</title>
<script>window.csrf = "a1b2c3d4e5f6a7b8c9d0";</script>
<style>body { color: red }</style></head>
<body>
<header><a href="/">Example Developers</a> <form><input name="q"></form></header>
<nav><ul><li>Overview</li><li>Reference</li></ul></nav>
<main>
  <h1>Changelog</h1>
  <p>Last updated: 2026-11-14 08:00 UTC</p>
  <section><h2>Version 3.0</h2>
    <ul><li>Added the   <code>/widgets</code>
      endpoint.</li><li>Removed the legacy field.</li></ul></section>
  <p>9f86d081884c7d659a2feaa0c55ad015a3bf4f1b</p>
  <div aria-hidden="true">Copy link</div>
</main>
<aside>Was this page helpful?</aside>
<footer>Build 2026-11-14T08:00:00Z, (c) Example</footer>
</body></html>
"""

RSS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Example blog</title><link>https://example.test/</link>
<item><title>Version 3.0 is out</title><link>https://example.test/blog/3</link><guid>post-3</guid></item>
<item><title>Version 2.0 is out</title><link>https://example.test/blog/2</link><guid>post-2</guid></item>
</channel></rss>
"""

ATOM = b"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Example news</title><id>urn:example:news</id>
<entry><title>Sunsetting the old API</title><id>urn:example:2</id>
  <link rel="self" href="https://example.test/self/2"/>
  <link rel="alternate" href="https://example.test/news/2"/></entry>
<entry><title type="html">Welcome &amp; hello</title><id>urn:example:1</id>
  <link href="https://example.test/news/1"/></entry>
</feed>
"""


def _source(kind: str = "page", name: str = "Graph API changelog") -> Any:
    return watch.Source(name=name, platform="Example", url=f"https://example.test/{kind}", kind=kind)


class _Fetcher:
    """A fetch that answers what each test gives it, or fails."""

    def __init__(self) -> None:
        self.body: bytes = PAGE.encode()
        self.error: str | None = None

    def __call__(self, url: str) -> tuple[bytes, str]:
        if self.error:
            raise watch.FetchError(self.error)
        return self.body, "utf-8"


class _Poster:
    def __init__(self) -> None:
        self.messages: list[str] = []
        self.accepts = True

    def __call__(self, text: str) -> bool:
        if self.accepts:
            self.messages.append(text)
        return self.accepts


def test_a_page_s_text_is_its_main_content_without_what_changes_on_each_build() -> None:
    assert watch.page_text(PAGE) == [
        "Changelog",
        "Version 3.0",
        "Added the /widgets endpoint.",
        "Removed the legacy field.",
    ]


def test_a_page_without_main_falls_back_to_its_article_then_its_body() -> None:
    article = "<body><nav>Menu</nav><article><p>Inside</p></article><p>Outside</p></body>"
    body = "<body><nav>Menu</nav><div>One</div><div>Two</div><footer>Foot</footer></body>"

    assert watch.page_text(article) == ["Inside"]
    assert watch.page_text(body) == ["One", "Two"]


def test_a_page_rendered_by_a_script_framework_is_read_from_its_element_tree() -> None:
    """Some pages carry their text in a JSON element tree alone, escaped
    in a string; the settings and identifiers beside it are never text."""
    tree = {
        "type": "Doc",
        "children": [
            {"type": "DocsH2", "children": ["Version 3.0"]},
            {"type": "CommonP", "children": ["Added the ", {"type": "CommonA", "children": ["/widgets"]}, " endpoint."]},
        ],
    }
    payload = json.dumps({"require": [["Render", {"sessionId": "synthetic-session", "tree": json.dumps(tree)}]]})
    page = f'<html><head><title>T</title></head><body><script type="application/json">{payload}</script></body></html>'

    assert watch.page_text(page) == ["Version 3.0", "Added the /widgets endpoint."]


def test_content_streamed_into_a_hidden_element_counts() -> None:
    page = '<body><main><template id="B:1"></template></main><div hidden id="S:1"><h1>Changelog</h1><p>New field.</p></div></body>'

    assert watch.page_text(page) == ["Changelog", "New field."]


def test_a_diff_shows_the_added_and_removed_lines_clipped_and_counted() -> None:
    before = ["Changelog", "Version 2.0", "Old"]
    after = ["Changelog", "Version 3.0", "x" * 500, *[f"line {n}" for n in range(20)]]

    shown, more = watch.changed_lines(before, after)

    assert shown[:3] == ["-Version 2.0", "-Old", "+Version 3.0"]
    assert shown[3] == "+" + "x" * 198 + "…"
    assert len(shown) == 15
    assert more == 2 + 22 - 15


def test_an_rss_feed_s_items_are_read_by_guid() -> None:
    assert watch.feed_items(RSS) == [
        watch.Item(id="post-3", title="Version 3.0 is out", link="https://example.test/blog/3"),
        watch.Item(id="post-2", title="Version 2.0 is out", link="https://example.test/blog/2"),
    ]


def test_an_atom_feed_s_entries_are_read_by_id_with_their_alternate_link() -> None:
    assert watch.feed_items(ATOM) == [
        watch.Item(id="urn:example:2", title="Sunsetting the old API", link="https://example.test/news/2"),
        watch.Item(id="urn:example:1", title="Welcome & hello", link="https://example.test/news/1"),
    ]


def test_what_is_not_a_feed_fails_the_source() -> None:
    with pytest.raises(watch.FetchError):
        watch.feed_items(b"<html><body>Not a feed</body></html>")
    with pytest.raises(watch.FetchError):
        watch.feed_items(b"not xml at all")


def test_a_page_s_first_run_keeps_a_copy_and_posts_nothing(tmp_path: Path) -> None:
    fetcher, poster = _Fetcher(), _Poster()

    assert watch.run([_source()], tmp_path, fetcher, poster)
    assert poster.messages == []
    (state,) = tmp_path.glob("*.json")
    assert json.loads(state.read_text())["lines"] == watch.page_text(PAGE)
    assert stat.S_IMODE(state.stat().st_mode) == 0o600


def test_an_unchanged_page_posts_nothing_though_its_volatile_parts_change(tmp_path: Path) -> None:
    fetcher, poster = _Fetcher(), _Poster()
    watch.run([_source()], tmp_path, fetcher, poster)
    fetcher.body = (
        PAGE.replace("2026-11-14", "2026-11-15").replace("a1b2c3d4e5f6a7b8c9d0", "ffffffffffffffffffff").replace("9f86d081884c7d659a2feaa0c55ad015a3bf4f1b", "0" * 40)
    ).encode()

    watch.run([_source()], tmp_path, fetcher, poster)

    assert poster.messages == []


def test_a_changed_page_posts_its_platform_name_url_and_diff(tmp_path: Path) -> None:
    fetcher, poster = _Fetcher(), _Poster()
    watch.run([_source()], tmp_path, fetcher, poster)
    fetcher.body = PAGE.replace("Removed the legacy field.", "Removed the &lt;legacy&gt; field &amp; more.").encode()

    watch.run([_source()], tmp_path, fetcher, poster)
    watch.run([_source()], tmp_path, fetcher, poster)

    assert poster.messages == [
        "*Example*: <https://example.test/page|Graph API changelog> changed\n"
        "```\n-Removed the legacy field.\n+Removed the &lt;legacy&gt; field &amp; more.\n```"
    ]


def test_a_feed_posts_each_new_item_once_oldest_first(tmp_path: Path) -> None:
    fetcher, poster = _Fetcher(), _Poster()
    fetcher.body = RSS
    source = _source("feed", "Developer blog")
    watch.run([source], tmp_path, fetcher, poster)
    assert poster.messages == []
    fetcher.body = RSS.replace(
        b"<item>",
        b"<item><title>Version 5.0</title><link>https://example.test/blog/5</link><guid>post-5</guid></item>"
        b"<item><title>Version 4.0</title><link>https://example.test/blog/4</link><guid>post-4</guid></item><item>",
        1,
    )

    watch.run([source], tmp_path, fetcher, poster)
    watch.run([source], tmp_path, fetcher, poster)

    assert poster.messages == [
        "*Example* · Developer blog: <https://example.test/blog/4|Version 4.0>",
        "*Example* · Developer blog: <https://example.test/blog/5|Version 5.0>",
    ]


def test_a_source_broken_three_runs_in_a_row_says_so_once_then_once_recovered(tmp_path: Path) -> None:
    fetcher, poster = _Fetcher(), _Poster()
    watch.run([_source()], tmp_path, fetcher, poster)
    fetcher.error = "HTTP 503"

    for _ in range(5):
        watch.run([_source()], tmp_path, fetcher, poster)
    assert poster.messages == ["watch broken: Graph API changelog (HTTP 503) <https://example.test/page|Example>"]

    fetcher.error = None
    watch.run([_source()], tmp_path, fetcher, poster)
    watch.run([_source()], tmp_path, fetcher, poster)

    assert poster.messages[1:] == ["watch recovered: Graph API changelog <https://example.test/page|Example>"]


def test_a_failure_keeps_the_copy_so_the_change_is_still_seen(tmp_path: Path) -> None:
    fetcher, poster = _Fetcher(), _Poster()
    watch.run([_source()], tmp_path, fetcher, poster)
    fetcher.error = "timed out"
    watch.run([_source()], tmp_path, fetcher, poster)
    fetcher.error = None
    fetcher.body = PAGE.replace("Version 3.0", "Version 4.0").encode()

    watch.run([_source()], tmp_path, fetcher, poster)

    assert len(poster.messages) == 1
    assert "+Version 4.0" in poster.messages[0]


def test_a_message_slack_refuses_is_sent_again_next_run(tmp_path: Path) -> None:
    fetcher, poster = _Fetcher(), _Poster()
    watch.run([_source()], tmp_path, fetcher, poster)
    fetcher.body = PAGE.replace("Version 3.0", "Version 4.0").encode()
    poster.accepts = False

    assert not watch.run([_source()], tmp_path, fetcher, poster)
    poster.accepts = True
    assert watch.run([_source()], tmp_path, fetcher, poster)

    assert len(poster.messages) == 1


def test_one_failing_source_never_stops_the_others(tmp_path: Path) -> None:
    def fetcher(url: str) -> tuple[bytes, str]:
        if url.endswith("/feed"):
            raise RuntimeError("unexpected")
        return PAGE.encode(), "utf-8"

    poster = _Poster()
    sources = [_source("feed", "Developer blog"), _source()]

    assert watch.run(sources, tmp_path, fetcher, poster)
    states = [json.loads(path.read_text()) for path in tmp_path.glob("*.json")]
    assert sorted(state.get("failures") for state in states) == [0, 1]
    assert any("lines" in state for state in states)


def test_a_page_with_no_readable_text_fails() -> None:
    fetcher, poster = _Fetcher(), _Poster()
    fetcher.body = b"<html><head><title>Loading</title><script>load()</script></head><body></body></html>"

    state, posted = watch.check(_source(), {}, fetcher, poster)

    assert posted
    assert state["reason"] == "no readable text"


# --- Over HTTP, on this machine ----------------------------------------------


class _Site(http.server.BaseHTTPRequestHandler):
    """A synthetic site: a gzipped page behind a redirect, a feed, an
    error, and a webhook that records what it is sent."""

    received: list[dict[str, Any]] = []
    agents: list[str] = []

    def do_GET(self) -> None:
        type(self).agents.append(self.headers.get("User-Agent", ""))
        if self.path == "/old":
            self.send_response(301)
            self.send_header("Location", "/changelog")
            self.end_headers()
        elif self.path == "/changelog":
            body = gzip.compress(PAGE.encode())
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/feed":
            self.send_response(200)
            self.send_header("Content-Type", "application/atom+xml")
            self.send_header("Content-Length", str(len(ATOM)))
            self.end_headers()
            self.wfile.write(ATOM)
        else:
            self.send_error(404)

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        type(self).received.append(json.loads(self.rfile.read(length)))
        self.send_response(200)
        self.send_header("Content-Length", "2")
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, *args: Any) -> None:
        pass


@pytest.fixture
def site() -> Iterator[str]:
    _Site.received = []
    _Site.agents = []
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), _Site)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()


def test_a_page_is_fetched_through_redirects_and_gzip_with_the_watch_s_user_agent(site: str) -> None:
    body, charset = watch.fetch(f"{site}/old")

    assert watch.page_text(body.decode(charset)) == watch.page_text(PAGE)
    assert _Site.agents == ["peal-platform-watch/1 (+https://peal.social)"] * 2


def test_an_http_error_is_a_short_reason(site: str) -> None:
    with pytest.raises(watch.FetchError, match="^HTTP 404$"):
        watch.fetch(f"{site}/missing")


def test_a_message_goes_to_the_webhook_as_slack_reads_it(site: str) -> None:
    assert watch.post(f"{site}/webhook", "hello")
    assert _Site.received == [{"text": "hello", "unfurl_links": False, "unfurl_media": False}]


def _run_script(tmp_path: Path, sources: list[dict[str, str]], webhook: str | None) -> subprocess.CompletedProcess[str]:
    (tmp_path / "sources.json").write_text(json.dumps(sources))
    environment = {name: value for name, value in os.environ.items() if name != "SLACK_CHANGELOG_WEBHOOK_URL"}
    if webhook is not None:
        environment["SLACK_CHANGELOG_WEBHOOK_URL"] = webhook
    return subprocess.run(
        [sys.executable, "-I", str(SCRIPT), "--sources", str(tmp_path / "sources.json"), "--state", str(tmp_path / "state")],
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )


def test_the_script_runs_every_source_and_never_prints_the_webhook(site: str, tmp_path: Path) -> None:
    webhook = f"{site}/services/synthetic-webhook"
    sources = [
        {"name": "Changelog", "platform": "Example", "url": f"{site}/old", "kind": "page"},
        {"name": "News", "platform": "Example", "url": f"{site}/feed", "kind": "feed"},
        {"name": "Gone", "platform": "Example", "url": f"{site}/missing", "kind": "page"},
    ]

    for _ in range(3):
        ran = _run_script(tmp_path, sources, webhook)
        assert ran.returncode == 0, ran.stderr
        assert "synthetic-webhook" not in ran.stdout + ran.stderr

    assert [message["text"] for message in _Site.received] == [
        f"watch broken: Gone (HTTP 404) <{site}/missing|Example>",
    ]
    assert stat.S_IMODE((tmp_path / "state").stat().st_mode) == 0o700


def test_the_script_refuses_to_run_without_its_webhook(tmp_path: Path) -> None:
    ran = _run_script(tmp_path, [], None)

    assert ran.returncode == 2
    assert "SLACK_CHANGELOG_WEBHOOK_URL" in ran.stderr
