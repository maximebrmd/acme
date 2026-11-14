"""The platform watch (roles/uptime/files/platform_watch.py): the text it
reads from a page, what it posts when a page or a feed changes, its first
run's silence, and its notices of a broken source. Pages and feeds are
synthetic and served from this machine; nothing here reaches the internet,
or Slack."""

from __future__ import annotations

import base64
import gzip
import http.client
import http.server
import importlib.util
import json
import os
import stat
import subprocess
import sys
import threading
import urllib.error
from collections.abc import Iterator
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest
from ansible.template import trust_as_template

from conftest import INFRA, ansible_render, render, role_file, run_tasks, settings, task

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


def test_feed_items_posted_before_slack_refuses_are_never_posted_again(tmp_path: Path) -> None:
    fetcher = _Fetcher()
    fetcher.body = RSS
    source = _source("feed", "Developer blog")
    watch.run([source], tmp_path, fetcher, _Poster())
    fetcher.body = RSS.replace(
        b"<item>",
        b"<item><title>Version 5.0</title><link>https://example.test/blog/5</link><guid>post-5</guid></item>"
        b"<item><title>Version 4.0</title><link>https://example.test/blog/4</link><guid>post-4</guid></item><item>",
        1,
    )
    taken: list[str] = []

    def once(text: str) -> bool:
        if taken:
            return False
        taken.append(text)
        return True

    assert not watch.run([source], tmp_path, fetcher, once)
    poster = _Poster()
    assert watch.run([source], tmp_path, fetcher, poster)

    assert taken == ["*Example* · Developer blog: <https://example.test/blog/4|Version 4.0>"]
    assert poster.messages == ["*Example* · Developer blog: <https://example.test/blog/5|Version 5.0>"]


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


# Eight times the limit, as a few kilobytes of gzip.
_BOMB = gzip.compress(b"\0" * (64 * 1024 * 1024), compresslevel=9)


class _Site(http.server.BaseHTTPRequestHandler):
    """A synthetic site: a gzipped page behind a redirect, a feed, an
    error, a body that inflates far beyond the watch's limit, redirects to
    places the watch never follows, and webhooks that record what they are
    sent, ask for fewer messages, or fail."""

    received: list[dict[str, Any]] = []
    agents: list[str] = []
    answers: list[int] = []

    def do_GET(self) -> None:
        type(self).agents.append(self.headers.get("User-Agent", ""))
        if self.path in ("/old", "/to-http", "/to-loopback", "/to-metadata"):
            target = {
                "/old": "/changelog",
                "/to-http": "http://example.test/changelog",
                "/to-loopback": f"https://127.0.0.1:{self.server.server_address[1]}/changelog",
                "/to-metadata": "https://169.254.169.254/latest/meta-data/",
            }[self.path]
            self.send_response(302)
            self.send_header("Location", target)
            self.send_header("Content-Length", "0")
            self.end_headers()
        elif self.path == "/bomb":
            body = _BOMB
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
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
        message = json.loads(self.rfile.read(length))
        answer = type(self).answers.pop(0) if type(self).answers else 200
        if answer != 200:
            self.send_response(answer)
            self.send_header("Retry-After", "2")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        type(self).received.append(message)
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
    _Site.answers = []
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), _Site)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()


def test_a_page_is_fetched_through_redirects_and_gzip_with_the_watch_s_user_agent(
    site: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The site here is plain HTTP on this machine, which the watch never
    follows a redirect to otherwise."""
    monkeypatch.setattr(watch, "REDIRECT_SCHEMES", ("https", "http"))
    monkeypatch.setattr(watch, "public_address", lambda host: True)

    body, charset = watch.fetch(f"{site}/old")

    assert watch.page_text(body.decode(charset)) == watch.page_text(PAGE)
    assert _Site.agents == ["peal-platform-watch/1 (+https://peal.social)"] * 2


@pytest.mark.parametrize(
    ("path", "reason"),
    [
        ("/old", "redirected to http address"),
        ("/to-http", "redirected to http address"),
        ("/to-loopback", "redirected to a private address"),
        ("/to-metadata", "redirected to a private address"),
    ],
)
def test_a_redirect_goes_to_https_on_the_internet_alone(site: str, path: str, reason: str) -> None:
    with pytest.raises(watch.FetchError, match=f"^{reason}$"):
        watch.fetch(f"{site}{path}")
    # Never followed: one request, the redirect's.
    assert len(_Site.agents) == 1


@pytest.mark.parametrize("host", ["127.0.0.1", "::1", "10.0.0.1", "192.168.1.1", "169.254.169.254", "fe80::1", "224.0.0.1", "localhost"])
def test_a_private_address_is_never_public(host: str) -> None:
    assert not watch.public_address(host)


def test_an_internet_address_is_public() -> None:
    """A literal address, so the test resolves nothing."""
    assert watch.public_address("9.9.9.9")


def test_a_body_that_inflates_beyond_the_limit_fails_the_source(site: str) -> None:
    """A few kilobytes that inflate to gigabytes stop at the limit."""
    assert len(_BOMB) < 64 * 1024
    with pytest.raises(watch.FetchError, match="^larger than 8 MB$"):
        watch.fetch(f"{site}/bomb")


def test_a_body_just_under_the_limit_inflates_whole() -> None:
    body = b"a" * watch.MAX_BYTES

    assert watch._decode(gzip.compress(body), "gzip") == body
    with pytest.raises(watch.FetchError):
        watch._decode(gzip.compress(body + b"a"), "gzip")


def test_an_http_error_is_a_short_reason(site: str) -> None:
    with pytest.raises(watch.FetchError, match="^HTTP 404$"):
        watch.fetch(f"{site}/missing")


def test_a_message_goes_to_the_webhook_as_slack_reads_it(site: str) -> None:
    assert watch.post(f"{site}/webhook", "hello")
    assert _Site.received == [{"text": "hello", "unfurl_links": False, "unfurl_media": False}]


class _Clock:
    """Time that passes only when the poster sleeps."""

    def __init__(self) -> None:
        self.now = 0.0
        self.slept: list[float] = []

    def sleep(self, seconds: float) -> None:
        self.slept.append(seconds)
        self.now += seconds

    def __call__(self) -> float:
        return self.now


def test_messages_go_a_second_apart(site: str) -> None:
    clock = _Clock()
    slack = watch.Slack(f"{site}/webhook", sleep=clock.sleep, clock=clock)

    assert slack("one") and slack("two") and slack("three")
    assert clock.slept == [1.0, 1.0]


def test_slack_asking_for_fewer_is_waited_for_once(site: str) -> None:
    clock = _Clock()
    slack = watch.Slack(f"{site}/webhook", sleep=clock.sleep, clock=clock)
    _Site.answers = [429]

    assert slack("one")
    assert clock.slept == [2.0]
    assert [message["text"] for message in _Site.received] == ["one"]


def test_a_second_429_stops_posting_for_the_run(site: str, capsys: pytest.CaptureFixture[str]) -> None:
    clock = _Clock()
    slack = watch.Slack(f"{site}/webhook", sleep=clock.sleep, clock=clock)
    _Site.answers = [429, 429]

    assert not slack("one")
    assert not slack("two")
    assert _Site.received == []
    assert "HTTP 429" in capsys.readouterr().err


def test_a_long_retry_after_is_capped(site: str, monkeypatch: pytest.MonkeyPatch) -> None:
    clock = _Clock()
    slack = watch.Slack(f"{site}/webhook", sleep=clock.sleep, clock=clock)
    monkeypatch.setattr(watch, "_send", _refusing_then_taking(3600.0))

    assert slack("one")
    assert clock.slept == [30.0]


def _refusing_then_taking(retry_after: float) -> Any:
    calls: list[str] = []

    def send(webhook: str, text: str) -> None:
        calls.append(text)
        if len(calls) == 1:
            raise watch._Answer(429, retry_after)

    return send


@pytest.mark.parametrize(
    "error",
    [
        http.client.RemoteDisconnected("closed by /services/synthetic-secret-path"),
        ValueError("URL can't contain control characters. '/services/synthetic-secret-path'"),
        ConnectionResetError("reset at /services/synthetic-secret-path"),
        urllib.error.URLError("refused at /services/synthetic-secret-path"),
    ],
)
def test_a_failed_post_logs_its_class_alone(error: Exception, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    """An error's message may hold the webhook's path, which is its
    secret."""

    def send(webhook: str, text: str) -> None:
        raise error

    monkeypatch.setattr(watch, "_send", send)

    assert not watch.Slack("https://hooks.slack.invalid/services/synthetic-secret-path")("hello")
    output = capsys.readouterr()
    assert "synthetic-secret-path" not in output.out + output.err
    assert error.__class__.__name__ in output.err


def test_an_invalid_webhook_url_is_a_failed_post_not_a_crash(capsys: pytest.CaptureFixture[str]) -> None:
    assert not watch.Slack("http://127.0.0.1:notaport/services/synthetic-secret-path")("hello")
    assert "synthetic-secret-path" not in capsys.readouterr().err


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
        {"name": "Changelog", "platform": "Example", "url": f"{site}/changelog", "kind": "page"},
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


# --- What the uptime role installs -------------------------------------------

UPTIME = settings("uptime")
DEFAULTS = role_file("uptime", "defaults")
VARS = role_file("uptime", "vars")
SOURCES = UPTIME["uptime_platform_watch_sources"]


def test_the_inventory_s_sources_are_ones_the_script_reads(tmp_path: Path) -> None:
    path = tmp_path / "sources.json"
    path.write_text(json.dumps(SOURCES))

    assert len(watch.load_sources(path)) == len(SOURCES) >= 14
    assert {source["platform"] for source in SOURCES} == {
        "Meta", "LinkedIn", "YouTube", "Google Business Profile", "TikTok", "Pinterest", "X",
    }


def _refused(sources: list[dict[str, Any]]) -> bool:
    found = task("uptime", "Refuse platform watch sources the watch cannot read")
    conditions = found["ansible.builtin.assert"]["that"]
    return not all(ansible_render("{{ " + condition + " }}", uptime_platform_watch_sources=sources) for condition in conditions)


def test_the_role_takes_the_inventory_s_sources() -> None:
    assert not _refused(SOURCES)


@pytest.mark.parametrize(
    "source",
    [
        {"name": "A", "platform": "P", "url": "http://example.test/", "kind": "page"},
        {"name": "A", "platform": "P", "url": "https://example.test/", "kind": "json"},
        {"name": "A", "url": "https://example.test/", "kind": "page"},
    ],
)
def test_the_role_refuses_a_source_the_script_cannot_read(source: dict[str, Any]) -> None:
    assert _refused([source])


def test_the_role_refuses_a_source_twice() -> None:
    assert _refused(SOURCES[:1] * 2)


def _watching(credentials: dict[str, str] | None, found: list[str] | None = None) -> bool:
    names: dict[str, Any] = {
        "uptime_set_credentials": trust_as_template(VARS["uptime_set_credentials"]),
    }
    if credentials is not None:
        names["uptime_credentials"] = credentials
    if found is not None:
        names["uptime_optional_set"] = {"stdout_lines": found}
    return ansible_render(VARS["uptime_platform_watch"], **names)


def test_the_watch_runs_once_its_webhook_is_set() -> None:
    assert _watching({"SLACK_CHANGELOG_WEBHOOK_URL": "https://hooks.slack.invalid/synthetic"}) is True
    assert _watching(None, ["SLACK_CHANGELOG_WEBHOOK_URL"]) is True


def test_the_watch_stays_off_without_its_webhook() -> None:
    assert _watching({"SLACK_CHANGELOG_WEBHOOK_URL": ""}) is False
    assert _watching({"TELEGRAM_BOT_TOKEN": "synthetic"}) is False
    assert _watching(None, []) is False
    assert _watching(None) is False


@pytest.mark.parametrize(
    "name",
    [
        "Install the platform watch",
        "Create the platform watch's folders",
        "Give the platform watch its webhook",
        "Write the platform watch's service and timer",
    ],
)
def test_nothing_of_the_watch_is_installed_without_its_webhook(name: str) -> None:
    when = task("uptime", name)["when"]

    assert "uptime_platform_watch | bool" in (when if isinstance(when, list) else [when])


def test_without_its_webhook_the_watch_is_stopped_and_taken_out() -> None:
    stopped = task("uptime", "Stop the platform watch without its webhook")
    removed = task("uptime", "Remove the platform watch without its webhook")

    assert stopped["ansible.builtin.systemd_service"] == {"name": "peal-platform-watch.timer", "state": "stopped", "enabled": False}
    assert "not (uptime_platform_watch | bool)" in stopped["when"]
    assert removed["when"] == "not (uptime_platform_watch | bool)"
    assert "{{ uptime_root }}/platform-watch.env" in removed["loop"]


OFF_PATH = [
    "Refuse platform watch sources the watch cannot read",
    "Look for the platform watch's timer",
    "Stop the platform watch without its webhook",
    "Remove the platform watch without its webhook",
    "Remove the platform watch's mount point without its webhook",
    "Look for the platform watch's Python",
    "Install the platform watch",
    "Create the platform watch's folders",
    "Write the platform watch's sources",
    "Give the platform watch its webhook",
    "Read the server's resolvers",
    "Write the platform watch's service and timer",
    "Start the platform watch's timer at boot",
]


@pytest.mark.parametrize("check", [False, True])
def test_without_its_webhook_a_server_without_the_watch_is_left_as_it_is(tmp_path: Path, check: bool) -> None:
    """Ansible itself, on this machine: nothing to stop, remove or install."""
    recap = run_tasks(
        tmp_path,
        "uptime",
        OFF_PATH,
        check=check,
        uptime_root=str(tmp_path / "uptime"),
        uptime_platform_watch_root=str(tmp_path / "uptime" / "platform-watch"),
        uptime_platform_watch_mount=str(tmp_path / "mount"),
        uptime_platform_watch_sources=SOURCES,
        uptime_credentials={"TELEGRAM_BOT_TOKEN": "synthetic"},
        **{name: VARS[name] for name in ("uptime_platform_watch", "uptime_set_credentials")},
    )

    assert recap["changed"] == 0
    assert recap["failed"] == 0
    assert not (tmp_path / "uptime").exists()


def _remove_mount_point(tmp_path: Path) -> dict[str, int]:
    return run_tasks(
        tmp_path,
        "uptime",
        ["Remove the platform watch's mount point without its webhook"],
        uptime_platform_watch_mount=str(tmp_path / "mount"),
        uptime_credentials={},
        **{name: VARS[name] for name in ("uptime_platform_watch", "uptime_set_credentials")},
    )


def test_the_empty_mount_point_goes_with_the_watch(tmp_path: Path) -> None:
    (tmp_path / "mount").mkdir()

    assert _remove_mount_point(tmp_path)["changed"] == 1
    assert not (tmp_path / "mount").exists()
    assert _remove_mount_point(tmp_path)["changed"] == 0


def test_a_mount_point_with_anything_in_it_stays(tmp_path: Path) -> None:
    (tmp_path / "mount").mkdir()
    (tmp_path / "mount" / "kept").write_text("synthetic")

    recap = _remove_mount_point(tmp_path)

    assert (recap["changed"], recap["failed"]) == (0, 0)
    assert (tmp_path / "mount" / "kept").exists()


def _unit(name: str) -> str:
    template = (INFRA / "roles" / "uptime" / "templates" / f"{name}.j2").read_text()
    names = {name: render(value, uptime_root="/srv/uptime") if isinstance(value, str) else value for name, value in DEFAULTS.items()}
    return render(template, **names, uptime_platform_watch_resolvers=["127.0.0.53"])


def test_the_service_runs_as_gatus_with_its_webhook_in_its_environment_alone() -> None:
    service = _unit("peal-platform-watch.service")
    lines = dict(line.split("=", 1) for line in service.splitlines() if "=" in line and not line.startswith("#"))

    assert lines["User"] == "gatus"
    assert lines["Type"] == "oneshot"
    assert lines["EnvironmentFile"] == "/srv/uptime/platform-watch.env"
    assert lines["BindPaths"] == "/srv/uptime/platform-watch:/var/lib/peal-platform-watch"
    assert lines["ExecStart"] == (
        "/usr/bin/python3 -I /usr/local/bin/peal-platform-watch"
        " --sources /var/lib/peal-platform-watch/sources.json --state /var/lib/peal-platform-watch/state"
    )
    assert "SLACK" not in lines["ExecStart"]
    assert lines["NoNewPrivileges"] == "true"
    assert lines["ProtectSystem"] == "strict"
    assert lines["CapabilityBoundingSet"] == ""
    assert lines["MemoryMax"] == "512M"
    assert lines["TasksMax"] == "32"
    assert lines["IPAddressDeny"] == "localhost link-local multicast"
    assert lines["IPAddressAllow"] == "127.0.0.53"


def _resolvers(resolv_conf: str) -> list[str]:
    return ansible_render(
        VARS["uptime_platform_watch_resolvers"],
        uptime_resolv_conf={"content": base64.b64encode(resolv_conf.encode()).decode()},
    )


def test_the_watch_reaches_the_local_resolver_alone() -> None:
    """systemd-resolved's stub on Ubuntu; a resolver on the internet needs
    no exception, as the unit denies local addresses alone."""
    assert _resolvers("# Generated\nnameserver 127.0.0.53\noptions edns0 trust-ad\nsearch .\n") == ["127.0.0.53"]
    assert _resolvers("nameserver 9.9.9.9\nnameserver 2620:fe::fe\n") == []
    assert _resolvers("nameserver ::1\nnameserver fe80::1%eth0\n") == ["::1", "fe80::1"]


def test_without_a_local_resolver_the_unit_allows_nothing_local() -> None:
    template = (INFRA / "roles" / "uptime" / "templates" / "peal-platform-watch.service.j2").read_text()
    names = {name: render(value, uptime_root="/srv/uptime") if isinstance(value, str) else value for name, value in DEFAULTS.items()}

    assert "IPAddressAllow" not in render(template, **names, uptime_platform_watch_resolvers=[])


def test_the_timer_runs_every_6_hours_at_a_random_minute() -> None:
    timer = _unit("peal-platform-watch.timer").splitlines()

    assert "OnCalendar=*-*-* 00/6:00:00" in timer
    assert "RandomizedDelaySec=1h" in timer
    assert "Persistent=true" in timer
    assert "WantedBy=timers.target" in timer


def _give_webhook(root: Path) -> str:
    found = task("uptime", "Give the platform watch its webhook")
    script = render(found["ansible.builtin.shell"], uptime_root=str(root))
    return subprocess.run(["sh", "-c", script], check=True, capture_output=True, text=True).stdout


def test_the_watch_s_file_holds_its_webhook_alone_for_root(tmp_path: Path) -> None:
    (tmp_path / "credentials.env").write_text(
        "TELEGRAM_BOT_TOKEN='synthetic-telegram'\n"
        "SLACK_CHANGELOG_WEBHOOK_URL='https://hooks.slack.invalid/synthetic-changelog'\n"
        "SLACK_ALERTS_WEBHOOK_URL='https://hooks.slack.invalid/synthetic-alerts'\n"
    )

    assert _give_webhook(tmp_path) == "changed\n"
    assert _give_webhook(tmp_path) == ""
    env = tmp_path / "platform-watch.env"
    assert env.read_text() == "SLACK_CHANGELOG_WEBHOOK_URL='https://hooks.slack.invalid/synthetic-changelog'\n"
    assert stat.S_IMODE(env.stat().st_mode) == 0o600
    assert not (tmp_path / "platform-watch.env.new").exists()


def test_the_watch_s_files_are_its_own() -> None:
    folders = task("uptime", "Create the platform watch's folders")["loop"]
    sources = task("uptime", "Write the platform watch's sources")["ansible.builtin.copy"]

    assert {"path": "{{ uptime_platform_watch_root }}/state", "owner": "gatus", "mode": "0700"} in folders
    assert {"path": "{{ uptime_platform_watch_root }}", "owner": "root", "mode": "0750"} in folders
    assert (sources["owner"], sources["group"], sources["mode"]) == ("root", "gatus", "0640")
    assert DEFAULTS["uptime_platform_watch_root"] == "{{ uptime_root }}/platform-watch"
