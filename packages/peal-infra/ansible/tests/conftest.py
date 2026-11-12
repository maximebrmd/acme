"""What the tests share: the roles' tasks as Ansible reads them, Jinja as
Ansible renders it, and the templates rendered by Ansible itself for each
server of the inventory."""

from __future__ import annotations

import functools
import json
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import jinja2
import pytest
import yaml
from ansible.parsing.dataloader import DataLoader
from ansible.template import Templar, trust_as_template

INFRA = Path(__file__).resolve().parent.parent

# Ansible renders strings with Jinja; an undefined name is an error there too.
_jinja = jinja2.Environment(undefined=jinja2.StrictUndefined, autoescape=False)


@functools.cache
def committed_inventory() -> str:
    """The inventory as committed, for Ansible's runs here: a copy without
    the files Git ignores (each environment's vault.yml, encrypted with a
    password the tests have not, and host_vars/*/local.yml, which a
    machine may hold), so the tests read what the repository says."""
    copy = Path(tempfile.mkdtemp(prefix="peal-inventory-")) / "inventory"
    shutil.copytree(INFRA / "inventory", copy, ignore=shutil.ignore_patterns("vault.yml", "local.yml"))
    return str(copy / "hosts.yml")


def render(text: str, **names: Any) -> str:
    """Renders one string as Ansible would, with the names given."""
    return _jinja.from_string(text).render(**names)


def ansible_render(text: str, **names: Any) -> Any:
    """Renders one string with Ansible's own templating, its filters and
    tests included, with the names given: a lone expression keeps its type,
    as it does in a task."""
    templar = Templar(loader=DataLoader(), variables=names)
    return templar.template(trust_as_template(text))


def settings(group: str) -> dict[str, Any]:
    """The inventory's settings for a group: group_vars/all, then the
    group's own files (main.yml, and cloudflare.yml where Pulumi writes it),
    never its vault."""
    folder = INFRA / "inventory" / "group_vars"
    merged: dict[str, Any] = {}
    for name in ("all", group):
        for path in sorted((folder / name).glob("*.yml")):
            if path.name != "vault.yml":
                merged.update(yaml.safe_load(path.read_text()) or {})
    return merged


def role_file(role: str, folder: str) -> dict[str, Any]:
    """A role's defaults or vars, as written."""
    return yaml.safe_load((INFRA / "roles" / role / folder / "main.yml").read_text())


def _flatten(tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    flat: list[dict[str, Any]] = []
    for task in tasks:
        flat.append(task)
        flat.extend(_flatten(task.get("block", [])))
    return flat


def task(role: str, name: str) -> dict[str, Any]:
    """The task of a role's tasks/main.yml with this name, blocks included."""
    tasks = yaml.safe_load((INFRA / "roles" / role / "tasks" / "main.yml").read_text())
    matches = [found for found in _flatten(tasks) if found.get("name") == name]
    assert len(matches) == 1, f"{role} has {len(matches)} tasks named {name!r}"
    return matches[0]


def command_of(found: dict[str, Any], **names: Any) -> list[str]:
    """The command a command task runs, rendered: its argv, or its free form
    split as the command module splits it."""
    args = found["ansible.builtin.command"]
    if isinstance(args, str):
        return shlex.split(render(args, **names))
    return [render(str(part), **names) for part in args["argv"]]


def stdin_of(found: dict[str, Any]) -> str | None:
    """What a command task writes to the command's input, with the newline
    the command module adds."""
    args = found["ansible.builtin.command"]
    if isinstance(args, str) or "stdin" not in args:
        return None
    return render(args["stdin"]) + "\n"


def play_tasks(
    folder: Path,
    role: str,
    names: list[str],
    *,
    check: bool = False,
    **settings_: Any,
) -> subprocess.CompletedProcess[str]:
    """Runs tasks of a role, by name and in the order given, with Ansible
    itself, on this machine and as this user, for the inventory's production
    server and with the settings given: what a server's files become when
    the role's paths name a folder of the test's. Returns the run, which may
    have failed."""
    play = {
        "name": f"Run tasks of the {role} role",
        "hosts": "peal-production",
        "gather_facts": False,
        "connection": "local",
        "vars": {"ansible_python_interpreter": "{{ ansible_playbook_python }}", **settings_},
        "tasks": [task(role, name) for name in names],
    }
    playbook = folder / "tasks.yml"
    playbook.write_text(yaml.safe_dump([play], sort_keys=False))
    return subprocess.run(
        [
            str(Path(sys.executable).parent / "ansible-playbook"),
            "--inventory",
            committed_inventory(),
            str(playbook),
            *(["--check"] if check else []),
        ],
        cwd=INFRA,
        check=False,
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )


def recap_of(ran: subprocess.CompletedProcess[str]) -> dict[str, int]:
    """A run's recap: ok, changed, skipped, failed…"""
    recap = ran.stdout.rsplit("PLAY RECAP", 1)[1]
    return {name: int(count) for name, count in re.findall(r"(\w+)=(\d+)", recap)}


def run_tasks(
    folder: Path,
    role: str,
    names: list[str],
    *,
    check: bool = False,
    **settings_: Any,
) -> dict[str, int]:
    """play_tasks, for a run that must succeed: returns its recap."""
    ran = play_tasks(folder, role, names, check=check, **settings_)
    assert ran.returncode == 0, ran.stdout + ran.stderr
    return recap_of(ran)


def render_inventory(folder: Path, **extra_vars: Any) -> Path:
    """The templates of tests/render.yml, rendered by Ansible for each
    server of the inventory, with the settings given above it, in
    <folder>/<server>/."""
    subprocess.run(
        [
            str(Path(sys.executable).parent / "ansible-playbook"),
            "--inventory",
            committed_inventory(),
            "tests/render.yml",
            "--extra-vars",
            json.dumps({"render_dir": str(folder), **extra_vars}),
        ],
        cwd=INFRA,
        check=True,
        capture_output=True,
    )
    return folder


@pytest.fixture(scope="session")
def rendered(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """The templates of tests/render.yml, rendered by Ansible for each
    server of the inventory, in <folder>/<server>/."""
    return render_inventory(tmp_path_factory.mktemp("rendered"))
