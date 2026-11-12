"""The uptime server on a shared host (uptime_shared_host): a server the
owner already uses for other sites, where uptime.yml runs the preflight and
the uptime role alone, never the baseline that a server of its own gets,
Gatus publishes on the host's loopback, and the host's own Caddy serves the
heartbeats and the status page from a site file Ansible drops in."""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
import yaml

from conftest import (
    INFRA,
    ansible_render,
    committed_inventory,
    play_tasks,
    recap_of,
    render,
    render_inventory,
    settings,
    task,
)

BASELINE = ["system", "ssh", "docker", "firewall"]


def _play(playbook: str) -> dict[str, Any]:
    (play,) = yaml.safe_load((INFRA / "playbooks" / playbook).read_text())
    return play


def _roles(play: dict[str, Any]) -> list[dict[str, Any]]:
    return [role if isinstance(role, dict) else {"role": role} for role in play["roles"]]


def test_a_server_of_its_own_is_the_committed_default() -> None:
    assert settings("uptime")["uptime_shared_host"] is False


def test_uptime_yml_runs_the_same_roles_in_the_same_order() -> None:
    """A server of its own keeps its baseline as before."""
    names = [role["role"] for role in _roles(_play("uptime.yml"))]

    assert names == ["peal_preflight", *BASELINE, "uptime"]


def test_a_shared_host_runs_the_preflight_and_the_uptime_role_alone() -> None:
    conditions = {role["role"]: role.get("when") for role in _roles(_play("uptime.yml"))}

    assert conditions == {
        "peal_preflight": None,
        **dict.fromkeys(BASELINE, "not (uptime_shared_host | bool)"),
        "uptime": None,
    }


def _run_baseline(folder: Path, shared: str) -> subprocess.CompletedProcess[str]:
    """uptime.yml's baseline roles, as its play lists them, run in check
    mode on this machine for the inventory's uptime server, without sudo."""
    play = _play("uptime.yml")
    play = {
        **play,
        "gather_facts": False,
        "connection": "local",
        "become": False,
        "vars": {"ansible_python_interpreter": "{{ ansible_playbook_python }}"},
        "roles": [role for role in _roles(play) if role["role"] in BASELINE],
    }
    playbook = folder / "baseline.yml"
    playbook.write_text(yaml.safe_dump([play], sort_keys=False))
    return subprocess.run(
        [
            str(Path(sys.executable).parent / "ansible-playbook"),
            "--inventory",
            committed_inventory(),
            str(playbook),
            "--check",
            "--extra-vars",
            f"uptime_shared_host={shared}",
        ],
        cwd=INFRA,
        check=False,
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )


def test_a_shared_host_runs_no_task_of_the_baseline(tmp_path: Path) -> None:
    """Every task of system, ssh, docker and firewall is skipped: nothing
    touches SSH, users, keys, apt, Docker, the firewall or sysctl."""
    ran = _run_baseline(tmp_path, "true")

    assert ran.returncode == 0, ran.stdout + ran.stderr
    recap = ran.stdout.rsplit("PLAY RECAP", 1)[1]
    assert " ok=0 " in recap
    assert " changed=0 " in recap
    assert " skipped=0 " not in recap


def _refuses_shared_hosts(**names: Any) -> bool:
    (refusal,) = [
        found for found in _play("bootstrap.yml")["tasks"] if found["name"] == "Refuse to bootstrap a shared host"
    ]
    return ansible_render("{{ " + refusal["ansible.builtin.assert"]["that"] + " }}", **names) is False


def test_bootstrap_refuses_a_shared_host() -> None:
    """It would replace the admin account's keys and sudo rule, which the
    owner's other sites log in with."""
    assert _refuses_shared_hosts(uptime_shared_host=True)
    assert _refuses_shared_hosts(uptime_shared_host="true")
    assert not _refuses_shared_hosts(uptime_shared_host=False)
    assert not _refuses_shared_hosts()


def test_bootstrap_refuses_before_it_changes_anything() -> None:
    tasks = [found["name"] for found in _play("bootstrap.yml")["tasks"]]

    assert tasks[0] == "Refuse to bootstrap a shared host"


UPTIME = settings("uptime")
# Ports a shared host leaves free, as its local.yml would name them.
GATUS_PORT = 18080
STATUS_PORT = 18081
SHARED = {"uptime_shared_host": True, "uptime_gatus_port": GATUS_PORT, "uptime_status_port": STATUS_PORT}


@pytest.fixture(scope="module")
def shared(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """What the uptime server gets on a shared host, status page on."""
    return render_inventory(tmp_path_factory.mktemp("shared"), **SHARED) / "peal-uptime"


@pytest.fixture(scope="module")
def shared_private(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """The same, with the status page off."""
    folder = tmp_path_factory.mktemp("shared-private")
    return render_inventory(folder, **SHARED, uptime_public_status=False) / "peal-uptime"


def _compose(folder: Path) -> dict[str, Any]:
    return yaml.safe_load((folder / "compose.yaml").read_text())


def _blocks(site: str) -> dict[str, str]:
    """The site blocks of a Caddyfile written as the role writes it: each
    from its address, at the line's start, to the brace that closes it."""
    return dict(re.findall(r"^(\S+) \{\n(.*?)^\}$", site, re.MULTILINE | re.DOTALL))


def test_a_shared_host_runs_gatus_alone_on_its_loopback(shared: Path) -> None:
    """The host's own Caddy is the one public entry: the stack publishes
    nothing but Gatus's two ports, on 127.0.0.1."""
    compose = _compose(shared)
    services = compose["services"]

    assert set(services) == {"gatus", "status"}
    assert services["gatus"]["ports"] == [f"127.0.0.1:{GATUS_PORT}:8080"]
    assert services["status"]["ports"] == [f"127.0.0.1:{STATUS_PORT}:8080"]
    assert "volumes" not in compose
    assert compose["name"] == "uptime"


def test_a_shared_host_without_the_status_page_runs_the_uptime_gatus_alone(shared_private: Path) -> None:
    services = _compose(shared_private)["services"]

    assert set(services) == {"gatus"}
    assert services["gatus"]["ports"] == [f"127.0.0.1:{GATUS_PORT}:8080"]


def test_the_site_file_serves_each_name_from_its_gatus(shared: Path) -> None:
    blocks = _blocks((shared / "caddy" / "peal-uptime.caddy").read_text())

    assert set(blocks) == {UPTIME["uptime_hostname"], UPTIME["uptime_status_hostname"]}
    heartbeats = blocks[UPTIME["uptime_hostname"]]
    status = blocks[UPTIME["uptime_status_hostname"]]
    assert f"reverse_proxy 127.0.0.1:{GATUS_PORT}\n" in heartbeats
    assert "path_regexp ^/api/v1/endpoints/[a-z0-9-]+_[a-z0-9-]+/external$" in heartbeats
    assert "respond 404" in heartbeats
    assert f"reverse_proxy 127.0.0.1:{STATUS_PORT}\n" in status
    assert "respond 405" in status
    assert str(STATUS_PORT) not in heartbeats
    assert str(GATUS_PORT) not in status


def test_the_site_file_leaves_the_host_s_settings_alone(shared: Path) -> None:
    """No global options, no certificate issuer and no import: the host's
    Caddy keeps its own, and gets each name's certificate as it does for
    its other sites."""
    site = (shared / "caddy" / "peal-uptime.caddy").read_text()
    lines = [line.strip() for line in site.splitlines() if not line.strip().startswith("#")]

    assert not site.lstrip().startswith("{")
    assert not [line for line in lines if line.split(" ", 1)[0] in {"import", "tls", "issuer", "auto_https", "servers"}]


def test_the_site_file_without_the_status_page_serves_the_heartbeats_alone(shared_private: Path) -> None:
    assert set(_blocks((shared_private / "caddy" / "peal-uptime.caddy").read_text())) == {UPTIME["uptime_hostname"]}


def test_a_server_of_its_own_keeps_caddy_in_its_stack(rendered: Path) -> None:
    services = _compose(rendered / "peal-uptime")["services"]
    routes = (rendered / "peal-uptime" / "caddy" / "routes.caddy").read_text()

    assert set(services) == {"gatus", "status", "caddy"}
    assert "reverse_proxy gatus:8080\n" in routes


@pytest.mark.parametrize(
    ("name", "shared_only"),
    [
        ("Require Docker Compose on the shared host", True),
        ("Require the host's Caddy", True),
        ("Find the loopback ports another service holds", True),
        ("Serve the uptime names through the host's Caddy", True),
        ("Reload the host's Caddy", True),
        ("Write Caddy's configuration", False),
    ],
)
def test_each_mode_runs_its_own_tasks(name: str, shared_only: bool) -> None:
    when = task("uptime", name)["when"]
    conditions = when if isinstance(when, list) else [when]

    assert ("uptime_shared_host | bool" if shared_only else "not (uptime_shared_host | bool)") in conditions


def _holders(tmp_path: Path, containers: dict[int, list[str]], listening: list[int]) -> list[str]:
    """Runs the role's port check with docker and ss stand-ins: the compose
    project of each container publishing a port, and the ports something
    listens on."""
    bin_folder = tmp_path / "bin"
    bin_folder.mkdir()
    lines = "\n".join(
        f"{port} c{index}:{project}" for port, projects in containers.items() for index, project in enumerate(projects)
    )
    (bin_folder / "docker").write_text(
        "#!/bin/sh\n"
        'port=$(printf "%s\\n" "$@" | sed -n "s/^publish=//p")\n'
        f"printf '%s\\n' '{lines}' | sed -n \"s/^$port //p\"\n"
    )
    (bin_folder / "ss").write_text(
        "#!/bin/sh\n"
        'port=$(printf "%s\\n" "$@" | sed -n "s/^sport = ://p")\n'
        f"held_ports='{' '.join(map(str, listening))}'\n"
        "for held in $held_ports; do\n"
        '  [ "$held" = "$port" ] && echo "LISTEN 0 4096 127.0.0.1:$port 0.0.0.0:*"\n'
        "done\n"
        "exit 0\n"
    )
    for stand_in in bin_folder.iterdir():
        stand_in.chmod(0o755)
    found = task("uptime", "Find the loopback ports another service holds")
    script = render(found["ansible.builtin.shell"], uptime_published_ports=[GATUS_PORT, STATUS_PORT])
    return subprocess.run(
        ["sh", "-c", script],
        check=True,
        capture_output=True,
        text=True,
        env={"PATH": f"{bin_folder}:/usr/bin:/bin"},
    ).stdout.splitlines()


def test_free_ports_pass(tmp_path: Path) -> None:
    assert _holders(tmp_path, {}, []) == []


def test_ports_the_uptime_stack_holds_pass(tmp_path: Path) -> None:
    """A second run finds its own containers there."""
    assert _holders(tmp_path, {GATUS_PORT: ["uptime"], STATUS_PORT: ["uptime"]}, [GATUS_PORT, STATUS_PORT]) == []


def test_a_port_another_container_publishes_is_refused(tmp_path: Path) -> None:
    """Whether or not Docker's proxy listens for it: the owner's daemon may
    publish through its firewall rules alone."""
    assert _holders(tmp_path, {GATUS_PORT: ["portfolio"], STATUS_PORT: [""]}, []) == [str(GATUS_PORT), str(STATUS_PORT)]


def test_a_port_another_process_listens_on_is_refused(tmp_path: Path) -> None:
    assert _holders(tmp_path, {}, [STATUS_PORT]) == [str(STATUS_PORT)]


SITE = "Serve the uptime names through the host's Caddy"


def _caddy(tmp_path: Path, *, valid: bool = True) -> Path:
    """A stand-in for the host's caddy: validate passes or fails, and adapt
    prints the site blocks' addresses of the files the main Caddyfile
    imports, quoted as Caddy's JSON has them."""
    caddy = tmp_path / "caddy"
    caddy.write_text(
        "#!/bin/sh\n"
        "set -eu\n"
        'config=$(printf "%s\\n" "$@" | sed -n "/^--config$/{n;p;}")\n'
        'case "$1" in\n'
        f"  validate) {'exit 0' if valid else 'echo invalid site file >&2; exit 1'} ;;\n"
        "  adapt)\n"
        '    for file in $(sed -n "s/^import //p" "$config"); do\n'
        '      [ -f "$file" ] && sed -n "s/^\\([^ #{][^ ]*\\) {$/\\"\\1\\"/p" "$file"\n'
        "    done\n"
        "    echo '{}' ;;\n"
        "esac\n"
    )
    caddy.chmod(0o755)
    return caddy


def _host(tmp_path: Path, *, imports: bool = True) -> dict[str, Any]:
    """A host's Caddy folder: a main Caddyfile, importing sites/*.caddy or
    not, and the settings that name it."""
    etc = tmp_path / "etc"
    (etc / "sites").mkdir(parents=True)
    site_file = etc / "sites" / "peal-uptime.caddy"
    (etc / "Caddyfile").write_text("portfolio.example {\n}\n" + (f"import {site_file}\n" if imports else ""))
    return {
        "uptime_shared_host": True,
        "uptime_caddy_bin": str(_caddy(tmp_path)),
        "uptime_caddy_config": str(etc / "Caddyfile"),
        "uptime_caddy_site_file": str(site_file),
        # The tests run as their own user, without sudo.
        "ansible_become": False,
        "uptime_caddy_user": "caddy",
        "uptime_caddy_names": [UPTIME["uptime_hostname"], UPTIME["uptime_status_hostname"]],
        "uptime_caddy_site": f"{UPTIME['uptime_hostname']} {{\n}}\n\n{UPTIME['uptime_status_hostname']} {{\n}}\n",
    }


def test_the_site_file_goes_in_once(tmp_path: Path) -> None:
    host = _host(tmp_path)

    first = play_tasks(tmp_path, "uptime", [SITE], **host)
    again = play_tasks(tmp_path, "uptime", [SITE], **host)

    assert first.returncode == 0, first.stdout + first.stderr
    assert recap_of(first)["changed"] == 1
    assert Path(host["uptime_caddy_site_file"]).read_text() == host["uptime_caddy_site"]
    assert again.returncode == 0, again.stdout + again.stderr
    assert recap_of(again)["changed"] == 0


def test_a_site_file_the_host_does_not_import_is_taken_out(tmp_path: Path) -> None:
    """With the import line the owner adds in the message."""
    host = _host(tmp_path, imports=False)

    ran = play_tasks(tmp_path, "uptime", [SITE], **host)

    assert ran.returncode != 0
    assert not Path(host["uptime_caddy_site_file"]).exists()
    assert f"import {Path(host['uptime_caddy_site_file']).parent}/*.caddy" in ran.stdout


def test_a_site_file_caddy_refuses_is_taken_out(tmp_path: Path) -> None:
    host = _host(tmp_path) | {"uptime_caddy_bin": str(_caddy(tmp_path, valid=False))}

    ran = play_tasks(tmp_path, "uptime", [SITE], **host)

    assert ran.returncode != 0
    assert not Path(host["uptime_caddy_site_file"]).exists()
    assert "invalid site file" in ran.stdout


def test_a_refused_change_puts_the_previous_site_file_back(tmp_path: Path) -> None:
    host = _host(tmp_path)
    assert play_tasks(tmp_path, "uptime", [SITE], **host).returncode == 0
    before = Path(host["uptime_caddy_site_file"]).read_text()

    ran = play_tasks(
        tmp_path,
        "uptime",
        [SITE],
        **host | {"uptime_caddy_bin": str(_caddy(tmp_path, valid=False)), "uptime_caddy_site": "changed {\n}\n"},
    )

    assert ran.returncode != 0
    assert Path(host["uptime_caddy_site_file"]).read_text() == before


def test_check_mode_writes_no_site_file(tmp_path: Path) -> None:
    host = _host(tmp_path)

    ran = play_tasks(tmp_path, "uptime", [SITE], check=True, **host)

    assert ran.returncode == 0, ran.stdout + ran.stderr
    assert recap_of(ran)["changed"] == 1
    assert not Path(host["uptime_caddy_site_file"]).exists()


def _docker_runs() -> bool:
    return (
        shutil.which("docker") is not None
        and subprocess.run(["docker", "info"], capture_output=True, check=False).returncode == 0
    )


@pytest.mark.skipif(not _docker_runs(), reason="Docker is not running")
def test_a_host_s_caddy_takes_the_site_file(shared: Path, tmp_path: Path) -> None:
    """The pinned Caddy, as a host's: a main Caddyfile with a site of the
    owner's and the import line, validated and adapted as the role does."""
    (tmp_path / "sites").mkdir()
    shutil.copy(shared / "caddy" / "peal-uptime.caddy", tmp_path / "sites" / "peal-uptime.caddy")
    (tmp_path / "Caddyfile").write_text(
        "{\n\tadmin localhost:2019\n}\n\nportfolio.example {\n\trespond 200\n}\n\nimport sites/*.caddy\n"
    )
    image = _compose_image()

    def caddy(*arguments: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["docker", "run", "--rm", "--network", "none", "--volume", f"{tmp_path}:/etc/caddy:ro", image,
             "caddy", *arguments, "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"],
            capture_output=True,
            text=True,
            check=False,
        )

    validated = caddy("validate")
    adapted = caddy("adapt")

    assert validated.returncode == 0, validated.stderr
    assert adapted.returncode == 0, adapted.stderr
    for name in (UPTIME["uptime_hostname"], UPTIME["uptime_status_hostname"], "portfolio.example"):
        assert f'"{name}"' in adapted.stdout


def _compose_image() -> str:
    """The Caddy the dedicated stack runs, at its pin."""
    return yaml.safe_load((INFRA / "roles" / "uptime" / "defaults" / "main.yml").read_text())["uptime_caddy_image"]
