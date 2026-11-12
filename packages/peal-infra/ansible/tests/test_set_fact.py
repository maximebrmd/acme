"""A fact set by a task is not defined for the task's other values, so a
set_fact that reads a fact it sets fails as undefined when it runs."""

from __future__ import annotations

import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent


def set_fact_tasks():
    for path in sorted((ROOT / "roles").glob("*/tasks/*.yml")):
        for task in yaml.safe_load(path.read_text()) or []:
            facts = task.get("ansible.builtin.set_fact")
            if isinstance(facts, dict):
                yield path.relative_to(ROOT), task.get("name", "?"), facts


def test_no_set_fact_reads_a_fact_it_sets() -> None:
    offenders = []
    for path, name, facts in set_fact_tasks():
        for key, value in facts.items():
            for other in facts:
                if other != key and re.search(rf"\b{re.escape(other)}\b", str(value)):
                    offenders.append(f"{path}: {name}: {key} reads {other}")
    templates = ROOT / "roles"
    for path, name, facts in set_fact_tasks():
        role = path.parts[1]
        for key, value in facts.items():
            for template in re.findall(r"template', '([^']+)'", str(value)):
                text = (templates / role / "templates" / template).read_text()
                for other in facts:
                    if other != key and re.search(rf"\b{re.escape(other)}\b", text):
                        offenders.append(f"{path}: {name}: {key}'s {template} reads {other}")
    assert offenders == []
