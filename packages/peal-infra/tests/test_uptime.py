"""The uptime server (roles/uptime, group_vars/uptime): what it checks and
holds, as Ansible renders it, then its stack run in Docker on a network that
reaches nothing outside: Gatus loads the configuration, takes a heartbeat
with its token alone, and Caddy shows the world nothing else on the
heartbeats' name, and the status page, read-only, on its own."""

from __future__ import annotations

import json
import re
import secrets
import shutil
import stat
import subprocess
import time
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest
import yaml

from conftest import INFRA, ansible_render, render, role_file, settings, task

UPTIME = settings("uptime")
ENVIRONMENTS = {environment["name"]: environment for environment in UPTIME["uptime_environments"]}
DEFAULTS = role_file("uptime", "defaults")
VARS = role_file("uptime", "vars")

# Pinned like the images the stack runs: the test's own client.
BUSYBOX = "busybox:1.38.0-musl@sha256:80e38f9a1b39188b8bdb28879178edb322a4402b081a9aedda1924609decd6f6"


def _key(group: str, name: str) -> str:
    """The key Gatus gives an endpoint (config/key/key.go)."""

    def sanitize(text: str) -> str:
        return re.sub(r"[/_., #+&]", "-", text.strip().lower())

    return f"{sanitize(group)}_{sanitize(name)}"


def _config(rendered: Path) -> dict[str, Any]:
    return yaml.safe_load((rendered / "peal-uptime" / "gatus" / "config.yaml").read_text())


def _status_config(rendered: Path) -> dict[str, Any]:
    return yaml.safe_load((rendered / "peal-uptime" / "status" / "config.yaml").read_text())


def _compose(rendered: Path) -> dict[str, Any]:
    return yaml.safe_load((rendered / "peal-uptime" / "compose.yaml").read_text())


def _references(value: Any) -> set[str]:
    """The ${NAME} that Gatus fills in from its environment, anywhere in a
    rendered value."""
    return set(re.findall(r"\$\{([A-Z0-9_]+)\}", json.dumps(value)))


def _provided() -> set[str]:
    """What the server gives Gatus's environment: the credentials it
    requires, and the heartbeat tokens it generates."""
    names = {"uptime_environments": UPTIME["uptime_environments"]}
    return {
        *ansible_render(VARS["uptime_required_credentials"], **names),
        *ansible_render(VARS["uptime_heartbeat_tokens"], **names),
    }


@pytest.mark.parametrize("environment", ["production", "sandbox"])
def test_it_checks_the_host_names_each_environment_has(environment: str) -> None:
    """Kept by hand in two places, so the uptime server never watches a name
    an environment has dropped."""
    hostnames = settings(environment)["peal_hostnames"]

    assert ENVIRONMENTS[environment]["hostnames"] == {
        surface: hostnames[surface] for surface in ("app", "site", "docs")
    }


@pytest.mark.parametrize("environment", ["production", "sandbox"])
def test_environments_behind_access_send_a_service_token(environment: str) -> None:
    assert ENVIRONMENTS[environment].get("access", False) == settings(environment)["peal_access_everything"]


def test_every_check_of_every_environment_runs(rendered: Path) -> None:
    keys = {_key(endpoint["group"], endpoint["name"]) for endpoint in _config(rendered)["endpoints"]}

    for name, environment in ENVIRONMENTS.items():
        expected = {_key(name, check["name"]) for check in DEFAULTS["uptime_checks"]}
        for host in environment["hostnames"].values():
            expected |= {_key(name, f"certificate of {host}"), _key(name, f"dns of {host}")}
        assert expected <= keys
    assert _key("uptime", f"certificate of {UPTIME['uptime_hostname']}") in keys
    assert _key("uptime", f"certificate of {UPTIME['uptime_status_hostname']}") in keys


def test_the_status_page_is_public_on_a_name_of_its_own() -> None:
    """The owner's decision: status.peal.social, apart from the name
    production's heartbeat goes to."""
    assert UPTIME["uptime_public_status"] is True
    assert UPTIME["uptime_status_hostname"] == "status.peal.social"
    assert UPTIME["uptime_status_hostname"] != UPTIME["uptime_hostname"]
    assert "uptime_status_hostname" in UPTIME["peal_preflight_names"]


def test_the_status_page_shows_production_s_customer_facing_checks_alone(rendered: Path) -> None:
    """The world sees whether Peal answers: not the sandbox, behind Access,
    nor the certificates, DNS or heartbeats, nor a URL or an error."""
    config = _status_config(rendered)
    public = [name for name, environment in ENVIRONMENTS.items() if environment.get("public", False)]

    assert public == ["production"]
    assert {_key(endpoint["group"], endpoint["name"]) for endpoint in config["endpoints"]} == {
        _key("production", check["name"]) for check in DEFAULTS["uptime_checks"]
    }
    text = json.dumps(config)
    for host in ENVIRONMENTS["sandbox"]["hostnames"].values():
        assert host not in text
    assert "alerting" not in config
    assert "external-endpoints" not in config
    assert not _references(config)
    for endpoint in config["endpoints"]:
        assert "headers" not in endpoint
        assert endpoint["ui"] == {
            "hide-conditions": True,
            "hide-errors": True,
            "hide-hostname": True,
            "hide-port": True,
            "hide-url": True,
        }


def test_the_status_page_s_gatus_is_the_one_caddy_serves(rendered: Path) -> None:
    services = _compose(rendered)["services"]
    status = (rendered / "peal-uptime" / "caddy" / "status.caddy").read_text()

    assert "reverse_proxy status:8080" in status
    assert "gatus:8080" not in status
    assert services["status"]["image"] == services["gatus"]["image"]
    assert "ports" not in services["status"]
    assert "env_file" not in services["status"]
    assert "./status:/config:ro" in services["status"]["volumes"]


def test_the_caddyfile_names_the_certificate_issuer_once() -> None:
    """The one acme the repository keeps: Caddy's ACME issuer, a protocol."""
    caddyfile = (INFRA / "roles" / "uptime" / "templates" / "Caddyfile.j2").read_text()

    assert caddyfile.lower().count("acme") == 1


def test_caddy_serves_the_status_page_on_its_own_name(rendered: Path) -> None:
    caddyfile = (rendered / "peal-uptime" / "caddy" / "Caddyfile").read_text()

    assert f"\n{UPTIME['uptime_hostname']} {{\n" in caddyfile
    assert f"\n{UPTIME['uptime_status_hostname']} {{\n" in caddyfile
    assert caddyfile.count("import /etc/caddy/routes.caddy") == 1
    assert caddyfile.count("import /etc/caddy/status.caddy") == 1


def test_checks_refuse_redirects_and_slow_answers(rendered: Path) -> None:
    """A page behind Access answers with a redirect to its sign-in, which
    must not pass for the page."""
    http = [endpoint for endpoint in _config(rendered)["endpoints"] if "dns" not in endpoint]

    assert http
    assert all(endpoint["client"]["ignore-redirect"] for endpoint in http)
    assert all(
        any(condition.startswith("[RESPONSE_TIME] < ") for condition in endpoint["conditions"])
        for endpoint in http
        if not endpoint["name"].startswith("certificate of ")
    )


def test_the_configuration_holds_no_secret(rendered: Path) -> None:
    config = _config(rendered)
    telegram = config["alerting"]["telegram"]
    headers = [value for endpoint in config["endpoints"] for value in endpoint.get("headers", {}).values()]
    tokens = [endpoint["token"] for endpoint in config["external-endpoints"]]

    assert telegram["token"] == "${TELEGRAM_BOT_TOKEN}"
    assert telegram["id"] == "${TELEGRAM_CHAT_ID}"
    assert headers
    assert all(re.fullmatch(r"\$\{[A-Z0-9_]+\}", value) for value in [*headers, *tokens])


def test_the_server_provides_every_secret_the_configuration_names(rendered: Path) -> None:
    assert _references(_config(rendered)) == _provided()


def test_production_sends_its_heartbeat_to_its_endpoint(rendered: Path) -> None:
    (heartbeat,) = _config(rendered)["external-endpoints"]
    key = _key(heartbeat["group"], heartbeat["name"])

    assert heartbeat["group"] == "production"
    assert settings("production")["peal_heartbeat_url"] == (
        f"https://{UPTIME['uptime_hostname']}/api/v1/endpoints/{key}/external?success=true"
    )
    assert settings("sandbox")["peal_heartbeat_url"] == ""


def test_the_heartbeat_tolerates_a_missed_beat(rendered: Path) -> None:
    """Grafana repeats it every 5 minutes (heartbeat.yaml)."""
    (heartbeat,) = _config(rendered)["external-endpoints"]
    grafana = yaml.safe_load(
        (INFRA.parent / "peal-docker" / "config" / "production" / "grafana" / "alerting" / "heartbeat.yaml").read_text()
    )
    (rule,) = grafana["groups"][0]["rules"]

    def minutes(duration: str) -> int:
        return int(duration.removesuffix("m"))

    assert minutes(heartbeat["heartbeat"]["interval"]) >= 2 * minutes(rule["notification_settings"]["repeat_interval"])


def test_grafana_heartbeat_reads_the_settings_compose_passes() -> None:
    compose = yaml.safe_load((INFRA.parent / "peal-docker" / "compose.production.yaml").read_text())
    grafana = compose["services"]["grafana"]

    assert {"PEAL_HEARTBEAT_URL", "PEAL_HEARTBEAT_TOKEN"} <= set(grafana["environment"])
    assert any(volume.endswith(":/etc/grafana/provisioning/alerting/heartbeat.yaml:ro") for volume in grafana["volumes"])


@pytest.mark.parametrize("service", ["gatus", "status", "caddy"])
def test_the_stack_pins_and_confines_each_service(rendered: Path, service: str) -> None:
    spec = _compose(rendered)["services"][service]

    assert re.fullmatch(r"[^@\s]+:[^@\s]+@sha256:[0-9a-f]{64}", spec["image"])
    assert spec["restart"] == "unless-stopped"
    assert spec["read_only"] is True
    assert "no-new-privileges:true" in spec["security_opt"]
    assert spec["cap_drop"] == ["ALL"]


def test_only_caddy_publishes_a_port_to_the_world(rendered: Path) -> None:
    services = _compose(rendered)["services"]
    public = [
        f"{name} {port}"
        for name, spec in services.items()
        for port in spec.get("ports", [])
        if not port.startswith("127.0.0.1:")
    ]

    assert public == ["caddy 443:443"]
    assert services["gatus"]["ports"] == [f"127.0.0.1:{UPTIME['uptime_gatus_port']}:8080"]


@pytest.mark.parametrize("service", ["gatus", "status"])
def test_gatus_runs_without_root(rendered: Path, service: str) -> None:
    assert not _compose(rendered)["services"][service]["user"].startswith("0:")


def test_caddy_is_the_one_self_hosters_run(rendered: Path) -> None:
    self_host = yaml.safe_load((INFRA.parent / "peal-docker" / "compose.self-host.yaml").read_text())

    assert _compose(rendered)["services"]["caddy"]["image"] == self_host["services"]["caddy"]["image"]


def _tokens(root: Path, names: list[str]) -> str:
    """Runs the role's token generation, as root would on the server, in
    root, and returns the names it generated."""
    found = task("uptime", "Generate the heartbeat tokens")
    script = render(found["ansible.builtin.shell"], uptime_root=str(root), uptime_heartbeat_tokens=names)
    return subprocess.run(["sh", "-c", script], check=True, capture_output=True, text=True).stdout


def test_a_heartbeat_token_is_generated_once(tmp_path: Path) -> None:
    secrets_env = tmp_path / "secrets.env"

    assert _tokens(tmp_path, ["PRODUCTION_HEARTBEAT_TOKEN"]) == "PRODUCTION_HEARTBEAT_TOKEN\n"
    first = secrets_env.read_text()
    inode = secrets_env.stat().st_ino

    assert re.fullmatch(r"PRODUCTION_HEARTBEAT_TOKEN=[0-9a-f]{64}\n", first)
    assert stat.S_IMODE(secrets_env.stat().st_mode) == 0o600
    assert _tokens(tmp_path, ["PRODUCTION_HEARTBEAT_TOKEN"]) == ""
    assert secrets_env.read_text() == first
    assert secrets_env.stat().st_ino == inode
    assert not (tmp_path / "secrets.env.new").exists()


def test_each_environment_gets_a_token_of_its_own(tmp_path: Path) -> None:
    _tokens(tmp_path, ["PRODUCTION_HEARTBEAT_TOKEN"])
    first = (tmp_path / "secrets.env").read_text()

    assert _tokens(tmp_path, ["PRODUCTION_HEARTBEAT_TOKEN", "SANDBOX_HEARTBEAT_TOKEN"]) == "SANDBOX_HEARTBEAT_TOKEN\n"
    both = dict(line.split("=", 1) for line in (tmp_path / "secrets.env").read_text().splitlines())
    assert (tmp_path / "secrets.env").read_text().startswith(first)
    assert both["PRODUCTION_HEARTBEAT_TOKEN"] != both["SANDBOX_HEARTBEAT_TOKEN"]


def _unset(root: Path, credentials: str) -> list[str]:
    """Runs the role's check of a credentials.env written by hand, as root
    would on the server, and returns the names it reports unset."""
    (root / "credentials.env").write_text(credentials)
    found = task("uptime", "Find the credentials not set on the server")
    script = render(
        found["ansible.builtin.shell"],
        uptime_root=str(root),
        uptime_required_credentials=["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
    )
    return subprocess.run(["sh", "-c", script], check=True, capture_output=True, text=True).stdout.splitlines()


@pytest.mark.parametrize("empty", ["", "''", '""'])
def test_an_empty_credential_written_by_hand_is_unset(tmp_path: Path, empty: str) -> None:
    """As in the vault, where an empty value counts as unset."""
    assert _unset(tmp_path, f"TELEGRAM_BOT_TOKEN={empty}\nTELEGRAM_CHAT_ID='-100'\n") == ["TELEGRAM_BOT_TOKEN"]


def test_ssh_forwards_to_the_dashboard_only() -> None:
    """The admin reaches Gatus's dashboard through SSH, and nothing else
    through it."""
    template = (INFRA / "roles" / "ssh" / "templates" / "sshd.conf.j2").read_text()
    permit_open = [render(value, uptime_gatus_port=UPTIME["uptime_gatus_port"]) for value in UPTIME["ssh_permit_open"]]
    sshd = ansible_render(template, admin_user="ops", ssh_tcp_forwarding="local", ssh_permit_open=permit_open)

    assert "AllowTcpForwarding local\n" in sshd
    # PermitOpen covers TCP alone: a Unix socket, such as Docker's, would
    # otherwise be forwarded too.
    assert "AllowStreamLocalForwarding no\n" in sshd
    assert f"PermitOpen 127.0.0.1:{UPTIME['uptime_gatus_port']}\n" in sshd
    assert "AllowTcpForwarding no\n" in ansible_render(
        template, admin_user="ops", **role_file("ssh", "defaults")
    )


def _docker_runs() -> bool:
    return (
        shutil.which("docker") is not None
        and subprocess.run(["docker", "info"], capture_output=True, check=False).returncode == 0
    )


needs_docker = pytest.mark.skipif(not _docker_runs(), reason="Docker is not running")

# The values the server would give: synthetic, made for this run.
TOKEN = secrets.token_hex(32)
ENVIRONMENT = {name: f"synthetic-{secrets.token_hex(8)}" for name in _provided()} | {
    "PRODUCTION_HEARTBEAT_TOKEN": TOKEN,
}


@dataclass(frozen=True)
class Stack:
    """Gatus and Caddy as the uptime server runs them, on a network of
    their own that reaches nothing outside it."""

    network: str
    gatus: str
    status: str
    caddy: str


def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, capture_output=True, text=True, check=False)


def _request(stack: Stack, url: str, *options: str) -> tuple[int, str]:
    """The status and body of a request from another container on the
    stack's network."""
    answer = _run(["docker", "run", "--rm", "--network", stack.network, BUSYBOX, "wget", "-S", "-O", "-", *options, url])
    statuses = re.findall(r"HTTP/1\.\d (\d{3})", answer.stderr)
    return (int(statuses[-1]) if statuses else 0), answer.stdout


@pytest.fixture(scope="module")
def stack(rendered: Path, tmp_path_factory: pytest.TempPathFactory) -> Iterator[Stack]:
    compose = _compose(rendered)["services"]
    name = f"peal-uptime-test-{secrets.token_hex(4)}"
    stack = Stack(name, f"{name}-gatus", f"{name}-status", f"{name}-caddy")
    # Caddy's routes as the server has them, served over plain HTTP: the
    # certificate is the server's business, and caddy validate checks it.
    edge = tmp_path_factory.mktemp("caddy")
    for routes in ("routes.caddy", "status.caddy"):
        shutil.copy(rendered / "peal-uptime" / "caddy" / routes, edge / routes)
    (edge / "Caddyfile").write_text(
        "http://:8080 {\n\timport /etc/caddy/routes.caddy\n}\n"
        "http://:8081 {\n\timport /etc/caddy/status.caddy\n}\n"
    )
    # Gatus runs as nobody and Caddy as root without capabilities, and Linux
    # keeps pytest's folders to their owner, so both read copies anyone may
    # read; on the server, their groups read them.
    config = tmp_path_factory.mktemp("gatus")
    shutil.copytree(rendered / "peal-uptime" / "gatus", config, dirs_exist_ok=True)
    public = tmp_path_factory.mktemp("status")
    shutil.copytree(rendered / "peal-uptime" / "status", public, dirs_exist_ok=True)
    for path in [config, *config.rglob("*"), public, *public.rglob("*"), edge, *edge.rglob("*")]:
        path.chmod(0o755 if path.is_dir() else 0o644)
    confined = ["--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true"]
    _run(["docker", "network", "create", "--internal", stack.network]).check_returncode()
    try:
        _run(["docker", "run", "--detach", "--name", stack.gatus, "--network", stack.network,
              "--network-alias", "gatus", *confined, "--user", "65534:65534",
              "--tmpfs", "/data:uid=65534,gid=65534", "--tmpfs", "/tmp",
              "--volume", f"{config}:/config:ro",
              "--env", "GATUS_CONFIG_PATH=/config/config.yaml",
              *[option for item in ENVIRONMENT.items() for option in ("--env", "=".join(item))],
              compose["gatus"]["image"]]).check_returncode()
        _run(["docker", "run", "--detach", "--name", stack.status, "--network", stack.network,
              "--network-alias", "status", *confined, "--user", "65534:65534",
              "--tmpfs", "/data:uid=65534,gid=65534", "--tmpfs", "/tmp",
              "--volume", f"{public}:/config:ro",
              "--env", "GATUS_CONFIG_PATH=/config/config.yaml",
              compose["status"]["image"]]).check_returncode()
        _run(["docker", "run", "--detach", "--name", stack.caddy, "--network", stack.network,
              "--network-alias", "caddy", *confined, "--cap-add", "NET_BIND_SERVICE",
              "--tmpfs", "/tmp", "--tmpfs", "/data", "--tmpfs", "/config",
              "--volume", f"{edge}:/etc/caddy:ro", compose["caddy"]["image"]]).check_returncode()
        for _ in range(60):
            if (
                _request(stack, "http://gatus:8080/health")[0] == 200
                and _request(stack, "http://status:8080/health")[0] == 200
                and _request(stack, "http://caddy:8080/")[0] == 404
            ):
                break
            time.sleep(1)
        else:
            logs = {
                name: _run(["docker", "logs", "--tail", "20", name]) for name in (stack.gatus, stack.status, stack.caddy)
            }
            pytest.fail("\n".join(f"{name}:\n{log.stdout}{log.stderr}" for name, log in logs.items()))
        yield stack
    finally:
        _run(["docker", "rm", "--force", stack.gatus, stack.status, stack.caddy])
        _run(["docker", "network", "rm", stack.network])


# Where the test's Caddy serves each name's routes.
HEARTBEATS = "http://caddy:8080"
STATUS_PAGE = "http://caddy:8081"


def _heartbeat(stack: Stack, token: str, key: str = "production_grafana-heartbeat", origin: str = HEARTBEATS) -> int:
    status, _ = _request(
        stack,
        f"{origin}/api/v1/endpoints/{key}/external?success=true",
        "--post-data=",
        "--header",
        f"Authorization: Bearer {token}",
    )
    return status


@needs_docker
def test_gatus_loads_the_configuration(stack: Stack) -> None:
    logs = _run(["docker", "logs", stack.gatus])

    assert _request(stack, "http://gatus:8080/health") == (200, '{"status":"UP"}')
    assert "configuredProviders=[telegram]" in logs.stdout + logs.stderr


@needs_docker
def test_gatus_runs_every_check(stack: Stack, rendered: Path) -> None:
    expected = {_key(endpoint["group"], endpoint["name"]) for endpoint in _config(rendered)["endpoints"]}
    for _ in range(30):
        _, body = _request(stack, "http://gatus:8080/api/v1/endpoints/statuses")
        if {endpoint["key"] for endpoint in json.loads(body or "[]")} >= expected:
            break
        time.sleep(1)
    else:
        pytest.fail(f"Gatus checked {body}")


@needs_docker
def test_gatus_takes_a_heartbeat_with_its_token(stack: Stack) -> None:
    assert _heartbeat(stack, TOKEN) == 200


@needs_docker
@pytest.mark.parametrize("token", ["", "wrong", ENVIRONMENT["TELEGRAM_BOT_TOKEN"]])
def test_gatus_refuses_a_heartbeat_with_another_token(stack: Stack, token: str) -> None:
    assert _heartbeat(stack, token) == 401


@needs_docker
@pytest.mark.parametrize(
    "path",
    ["/", "/health", "/api/v1/endpoints/statuses", "/api/v1/config", "/api/v1/endpoints/production_api/statuses"],
)
def test_caddy_shows_the_world_no_dashboard(stack: Stack, path: str) -> None:
    assert _request(stack, f"http://caddy:8080{path}")[0] == 404


@needs_docker
def test_caddy_takes_heartbeats_by_post_only(stack: Stack) -> None:
    url = "http://caddy:8080/api/v1/endpoints/production_grafana-heartbeat/external?success=true"

    assert _request(stack, url, "--header", f"Authorization: Bearer {TOKEN}")[0] == 404


@needs_docker
@pytest.mark.parametrize(
    "path",
    ["/", "/api/v1/endpoints/statuses", "/api/v1/endpoints/production_api/statuses"],
)
def test_the_status_page_shows_the_dashboard(stack: Stack, path: str) -> None:
    assert _request(stack, f"{STATUS_PAGE}{path}")[0] == 200


@needs_docker
def test_the_status_page_lists_production_s_checks_alone(stack: Stack, rendered: Path) -> None:
    expected = {_key(endpoint["group"], endpoint["name"]) for endpoint in _status_config(rendered)["endpoints"]}
    for _ in range(30):
        _, body = _request(stack, f"{STATUS_PAGE}/api/v1/endpoints/statuses")
        listed = {endpoint["key"] for endpoint in json.loads(body or "[]")}
        if listed >= expected:
            break
        time.sleep(1)
    else:
        pytest.fail(f"The status page lists {body}")

    assert listed == expected
    assert "sandbox" not in body


@needs_docker
def test_the_status_page_takes_no_heartbeat(stack: Stack) -> None:
    """Even with the right token: heartbeats go to the uptime server's own
    name."""
    assert _heartbeat(stack, TOKEN, origin=STATUS_PAGE) == 405


@needs_docker
@pytest.mark.parametrize("public_status", [False, True])
def test_caddy_validates_the_configuration(rendered: Path, tmp_path: Path, public_status: bool) -> None:
    """The server's Caddyfile, with its certificates' settings, and its
    routes, either way the owner decides on the status page."""
    caddy = rendered / "peal-uptime" / "caddy"
    caddyfile = (INFRA / "roles" / "uptime" / "templates" / "Caddyfile.j2").read_text()
    (tmp_path / "Caddyfile").write_text(
        render(
            caddyfile,
            uptime_hostname=UPTIME["uptime_hostname"],
            uptime_status_hostname=UPTIME["uptime_status_hostname"],
            uptime_public_status=public_status,
        )
    )
    for routes in ("routes.caddy", "status.caddy"):
        shutil.copy(caddy / routes, tmp_path / routes)
    image = _compose(rendered)["services"]["caddy"]["image"]

    validated = _run(["docker", "run", "--rm", "--network", "none", "--volume", f"{tmp_path}:/etc/caddy:ro",
                      image, "caddy", "validate", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"])

    assert validated.returncode == 0, validated.stderr
