"""The uptime server on a shared host (uptime_shared_host): a server the
owner already uses for other sites, where uptime.yml runs the preflight and
the uptime role alone, never the baseline that a server of its own gets,
Gatus publishes on the host's loopback, and the host's own Caddy serves the
heartbeats and the status page from a site file Ansible drops in."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml

from conftest import INFRA, ansible_render, committed_inventory, settings

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
