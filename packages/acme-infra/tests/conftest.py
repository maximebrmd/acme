"""What the tests share: the roles' tasks as Ansible reads them, Jinja as
Ansible renders it, and the templates rendered by Ansible itself for each
server of the inventory."""

from __future__ import annotations

import shlex
import subprocess
import sys
from pathlib import Path
from typing import Any

import jinja2
import pytest
import yaml

INFRA = Path(__file__).resolve().parent.parent

# Ansible renders strings with Jinja; an undefined name is an error there too.
_jinja = jinja2.Environment(undefined=jinja2.StrictUndefined, autoescape=False)


def render(text: str, **names: Any) -> str:
    """Renders one string as Ansible would, with the names given."""
    return _jinja.from_string(text).render(**names)


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


@pytest.fixture(scope="session")
def rendered(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """The templates of tests/render.yml, rendered by Ansible for each
    server of the inventory, in <folder>/<server>/."""
    folder = tmp_path_factory.mktemp("rendered")
    subprocess.run(
        [
            str(Path(sys.executable).parent / "ansible-playbook"),
            "tests/render.yml",
            "--extra-vars",
            f"render_dir={folder}",
        ],
        cwd=INFRA,
        check=True,
        capture_output=True,
    )
    return folder
