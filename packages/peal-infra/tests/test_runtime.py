"""What peal_runtime writes for Compose (host.env) and what it requires of
the credentials, as Ansible renders them for each server."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path
from typing import Any

import pytest

from ansible.template import trust_as_template

from conftest import INFRA, ansible_render, render, role_file, settings, task

ENVIRONMENTS = ["production", "sandbox"]

# A line Compose reads as one setting: a name, then a single-quoted value
# with no quote or line break in it.
LINE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*='[^'\r\n]*'")


def _host_env(rendered: Path, environment: str) -> dict[str, str]:
    lines = (rendered / f"peal-{environment}" / "host.env").read_text().splitlines()
    settings_lines = [line for line in lines if line and not line.startswith("#")]
    assert all(LINE.fullmatch(line) for line in settings_lines), settings_lines
    return {name: value.strip("'") for name, value in (line.split("=", 1) for line in settings_lines)}


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_host_env_holds_one_setting_a_line(rendered: Path, environment: str) -> None:
    host_env = _host_env(rendered, environment)

    assert host_env["PUBLIC_URL"] == f"https://{settings(environment)['peal_hostnames']['app']}"


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_peals_servers_keep_what_french_law_has_a_host_keep(rendered: Path, environment: str) -> None:
    """The software keeps nothing by default; Peal, a host established in
    France, must (loi n° 2004-575, art. 6, V, A)."""
    assert _host_env(rendered, environment)["PEAL_LEGAL_RETENTION"] == "true"


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_the_server_reads_the_privacy_declaration_the_role_writes(rendered: Path, environment: str) -> None:
    host_env = _host_env(rendered, environment)

    assert host_env["PEAL_PRIVACY_DECLARATION"] == f"{settings(environment)['peal_root']}/privacy-declaration.json"
    written = task("peal_runtime", "Write the privacy declaration")
    assert written["ansible.builtin.copy"]["dest"] == "{{ peal_root }}/privacy-declaration.json"


def test_a_changed_declaration_reaches_the_server_that_runs() -> None:
    """The server reads the file when it starts: written again, it would
    otherwise keep telling users the old declaration until a release."""
    written = task("peal_runtime", "Write the privacy declaration")
    (handler,) = [
        found
        for found in role_file("peal_runtime", "handlers")
        if found.get("listen") == written["notify"] or found["name"] == written["notify"]
    ]

    assert handler["ansible.builtin.command"]["argv"] == ["{{ peal_compose_bin }}", "restart", "server"]
    # Nothing to restart before the first release.
    assert handler["ansible.builtin.command"]["removes"] == "{{ peal_root }}/current"


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_no_provider_is_declared_before_the_owner_confirms_it(environment: str) -> None:
    """Each user's export repeats the declaration: a provider guessed here
    would be told to users as a fact."""
    assert settings(environment)["peal_privacy_declaration"] == {}


def _ledger_exposed(**names: Any) -> bool:
    """Whether peal_runtime refuses the settings: media served publicly
    while the erasure ledger sits in the same bucket."""
    found = task("peal_runtime", "Refuse a public media bucket that holds the erasure ledger")
    return ansible_render(found["vars"]["peal_runtime_ledger_exposed"], **names)


def test_the_erasure_ledger_stays_in_the_media_bucket_while_it_is_private(rendered: Path) -> None:
    for environment in ENVIRONMENTS:
        assert "PEAL_ERASURE_LEDGER_BUCKET" not in _host_env(rendered, environment)
        assert "PEAL_MEDIA_PUBLIC_BASE_URL" not in _host_env(rendered, environment)


def test_a_public_media_bucket_needs_a_ledger_bucket_of_its_own() -> None:
    public = {"PEAL_MEDIA_PUBLIC_BASE_URL": "https://media.example.com"}

    assert _ledger_exposed(peal_runtime_host_settings=public) is True
    assert _ledger_exposed(peal_runtime_host_settings={**public, "PEAL_ERASURE_LEDGER_BUCKET": "peal-erasures"}) is False
    assert _ledger_exposed(peal_runtime_host_settings={}) is False


def test_a_ledger_bucket_that_is_the_media_bucket_is_not_one_of_its_own() -> None:
    public = {"PEAL_MEDIA_PUBLIC_BASE_URL": "https://media.example.com", "PEAL_S3_BUCKET": "peal-media"}

    assert _ledger_exposed(peal_runtime_host_settings={**public, "PEAL_ERASURE_LEDGER_BUCKET": "peal-media"}) is True
    assert _ledger_exposed(peal_runtime_host_settings={**public, "PEAL_ERASURE_LEDGER_BUCKET": "peal-erasures"}) is False
    # Private media: the ledger may sit beside it, named or not.
    assert _ledger_exposed(
        peal_runtime_host_settings={"PEAL_S3_BUCKET": "peal-media", "PEAL_ERASURE_LEDGER_BUCKET": "peal-media"}
    ) is False


def test_production_sends_its_heartbeat(rendered: Path) -> None:
    host_env = _host_env(rendered, "production")

    assert host_env["PEAL_GRAFANA_HEARTBEAT"] == "./config/production/grafana/alerting/heartbeat.yaml"
    assert host_env["PEAL_HEARTBEAT_URL"] == settings("production")["peal_heartbeat_url"]
    assert (INFRA.parent / "peal-docker" / host_env["PEAL_GRAFANA_HEARTBEAT"]).is_file()


def test_production_samples_one_trace_in_ten(rendered: Path) -> None:
    host_env = _host_env(rendered, "production")

    assert host_env["OTEL_TRACES_SAMPLER"] == "parentbased_traceidratio"
    assert host_env["OTEL_TRACES_SAMPLER_ARG"] == "0.1"


def test_the_sandbox_samples_every_trace(rendered: Path) -> None:
    host_env = _host_env(rendered, "sandbox")

    assert host_env["OTEL_TRACES_SAMPLER"] == "parentbased_always_on"
    assert "OTEL_TRACES_SAMPLER_ARG" not in host_env


def test_the_sandbox_sends_none(rendered: Path) -> None:
    host_env = _host_env(rendered, "sandbox")

    assert "PEAL_GRAFANA_HEARTBEAT" not in host_env
    assert "PEAL_HEARTBEAT_URL" not in host_env


def _misread(host_settings: dict[str, Any]) -> list[str]:
    """The settings peal_runtime refuses to write, by name."""
    found = task("peal_runtime", "Refuse host settings Compose would misread")
    return ansible_render(found["vars"]["peal_runtime_misread"], peal_runtime_host_settings=host_settings)


@pytest.mark.parametrize(
    "value",
    ["it's", "two\nlines", "carriage\rreturn", ["a", "list"], {"a": "map"}, None],
)
def test_host_settings_refuse_what_compose_would_misread(value: Any) -> None:
    assert _misread({"PUBLIC_URL": "https://app.example.com", "PEAL_AI_PROVIDER": value}) == ["PEAL_AI_PROVIDER"]


@pytest.mark.parametrize("name", ["1ST", "WITH SPACE", "WITH-DASH", "A=B", "", "TRAILING\n", "TWO\nLINES"])
def test_host_settings_refuse_names_compose_would_misread(name: str) -> None:
    assert _misread({name: "value"}) == [name]


@pytest.mark.parametrize("value", ["Peal <noreply@example.com>", "https://a.example.com/x?y=1&z=$HOME", 3000, True, ""])
def test_host_settings_take_strings_and_numbers(value: Any) -> None:
    assert _misread({"PEAL_SETTING": value}) == []


def test_host_env_writes_booleans_as_the_server_reads_them() -> None:
    """The server's Config.Boolean takes true and false, not True and
    False."""
    template = (INFRA / "roles" / "peal_runtime" / "templates" / "host.env.j2").read_text()
    host_env = ansible_render(template, peal_runtime_host_settings={"ON": True, "OFF": False})

    assert "ON='true'\n" in host_env
    assert "OFF='false'\n" in host_env


def _required(environment: str) -> list[str]:
    expression = role_file("peal_runtime", "vars")["peal_runtime_required_credentials"]
    return ansible_render(expression, **settings(environment))


def test_production_requires_the_heartbeat_token() -> None:
    assert "PEAL_HEARTBEAT_TOKEN" in _required("production")


def test_the_sandbox_does_not() -> None:
    assert "PEAL_HEARTBEAT_TOKEN" not in _required("sandbox")


def _unset(tmp_path: Path, credentials: str) -> list[str]:
    """Runs the role's check of a credentials.env written by hand, as root
    would on the server, and returns the names it reports unset."""
    (tmp_path / "credentials.env").write_text(credentials)
    found = task("peal_runtime", "Find the credentials not set on the server")
    script = render(
        found["ansible.builtin.shell"],
        peal_root=str(tmp_path),
        peal_runtime_required_credentials=["PEAL_S3_ACCESS_KEY_ID", "TELEGRAM_BOT_TOKEN"],
        peal_mail_credentials=["RESEND_API_KEY", "SMTP_URL"],
    )
    return subprocess.run(["sh", "-c", script], check=True, capture_output=True, text=True).stdout.splitlines()


def test_credentials_written_by_hand_are_set_with_a_value(tmp_path: Path) -> None:
    assert _unset(tmp_path, "PEAL_S3_ACCESS_KEY_ID='synthetic'\nTELEGRAM_BOT_TOKEN=synthetic\nSMTP_URL=\"smtp://mail\"\n") == []


@pytest.mark.parametrize("empty", ["", "''", '""'])
def test_an_empty_credential_written_by_hand_is_unset(tmp_path: Path, empty: str) -> None:
    """As in the vault, where an empty value counts as unset."""
    credentials = f"PEAL_S3_ACCESS_KEY_ID={empty}\nTELEGRAM_BOT_TOKEN='synthetic'\nRESEND_API_KEY={empty}\n"

    assert _unset(tmp_path, credentials) == ["PEAL_S3_ACCESS_KEY_ID", "RESEND_API_KEY or SMTP_URL"]


def _misplaced(media: str, backup: str, confirmed: tuple[str, ...] = ()) -> list[str]:
    """The storage endpoints peal_runtime refuses, by setting, when the
    owner confirmed these hosts keep their buckets in the EU."""
    found = task("peal_runtime", "Refuse storage endpoints the stack would misread, or outside the EU")
    return ansible_render(
        found["vars"]["peal_runtime_misplaced"],
        **{name: trust_as_template(value) for name, value in found["vars"].items()},
        peal_media_endpoint=media,
        peal_backup_endpoint=backup,
        peal_storage_eu_hosts=list(confirmed),
    )


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_the_inventory_s_storage_endpoints_are_taken(environment: str) -> None:
    chosen = settings(environment)

    assert _misplaced(chosen["peal_media_endpoint"], chosen["peal_backup_endpoint"]) == []


STORE = ("s3.eu-store.test",)


def test_any_s3_store_is_taken_once_the_owner_confirms_it_is_in_the_eu() -> None:
    """The stack asks for the S3 API, not for a provider; but nothing in
    another store's endpoint says where its buckets are, so the inventory
    does (peal_storage_eu_hosts)."""
    assert _misplaced("https://s3.eu-store.test", "s3.eu-store.test", STORE) == []
    assert _misplaced("https://S3.EU-Store.test:443/", "s3.eu-store.test:443", STORE) == []
    assert _misplaced("https://s3.eu-store.test", "s3.eu-store.test") == [
        "peal_media_endpoint",
        "peal_backup_endpoint",
    ]
    assert _misplaced("https://s3.us-store.test", "s3.eu-store.test", STORE) == ["peal_media_endpoint"]


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_no_store_is_confirmed_before_the_owner_does(environment: str) -> None:
    assert settings(environment)["peal_storage_eu_hosts"] == []


def test_an_r2_endpoint_is_recognised_however_it_is_written() -> None:
    """Host names have no case, and a port changes nothing of where the
    bucket is."""
    account = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

    assert _misplaced(
        f"https://{account}.R2.CloudflareStorage.com", f"{account}.R2.CLOUDFLARESTORAGE.COM"
    ) == ["peal_media_endpoint", "peal_backup_endpoint"]
    assert _misplaced(
        f"https://{account}.eu.r2.cloudflarestorage.com:443", f"{account}.eu.r2.cloudflarestorage.com:443"
    ) == []
    assert _misplaced(
        f"https://{account}.EU.R2.cloudflarestorage.com/", f"{account}.eu.r2.cloudflarestorage.com"
    ) == []
    # Confirming a host never lets an R2 endpoint outside the EU through.
    plain = f"{account}.r2.cloudflarestorage.com"
    assert _misplaced(f"https://{plain}", plain, (plain,)) == ["peal_media_endpoint", "peal_backup_endpoint"]
    # A name that only holds R2's is another store's.
    assert _misplaced(
        "https://eu.r2.cloudflarestorage.com.store.test", "x.eu.r2.cloudflarestorage.com.store.test"
    ) == ["peal_media_endpoint", "peal_backup_endpoint"]


def test_an_r2_endpoint_outside_the_eu_jurisdiction_is_refused() -> None:
    """A bucket made in R2's EU jurisdiction answers at the `.eu.` endpoint
    alone: the account's plain endpoint names buckets stored anywhere."""
    account = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

    assert _misplaced(
        f"https://{account}.r2.cloudflarestorage.com", f"{account}.r2.cloudflarestorage.com"
    ) == ["peal_media_endpoint", "peal_backup_endpoint"]
    assert _misplaced(
        f"https://{account}.eu.r2.cloudflarestorage.com", f"{account}.r2.cloudflarestorage.com"
    ) == ["peal_backup_endpoint"]


def test_the_media_endpoint_is_a_url_and_the_backup_endpoint_a_host() -> None:
    """The server reads a URL; pgBackRest reads a host, and takes a scheme
    for part of its name."""
    assert _misplaced("s3.eu-store.test", "s3.eu-store.test", STORE) == ["peal_media_endpoint"]
    assert _misplaced("http://s3.eu-store.test", "s3.eu-store.test", STORE) == ["peal_media_endpoint"]
    assert _misplaced("https://s3.eu-store.test", "https://s3.eu-store.test", STORE) == ["peal_backup_endpoint"]
