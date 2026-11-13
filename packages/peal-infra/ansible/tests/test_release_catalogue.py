"""The release's comparison of Stripe's catalogue with the one the new
image gives (roles/peal_release), run by Ansible against a stand-in for
peal-compose: only on a server that bills, before the new server replaces
the old one, and reported, never a failure, while per-account pricing is
not sold (the server only warns then)."""

from __future__ import annotations

import stat
from pathlib import Path

import yaml

from conftest import INFRA, play_tasks, recap_of

COMPARE = "Compare Stripe's catalogue with the release's"
REPORT = "Report a Stripe catalogue that differs"

# What stripe-catalogue --check prints when Stripe lacks the catalogue.
DIFFERS = "StripeCatalogueDiffers: Stripe's catalogue is not the one the rate card gives"


def _compose(folder: Path, rc: int) -> Path:
    """A peal-compose that records its arguments and answers as the
    command would: the differences and 1, or nothing and 0."""
    script = folder / "peal-compose"
    script.write_text(
        "#!/bin/sh\n"
        f'printf "%s\\n" "$@" > "{folder}/compose-args"\n'
        + (f'echo "{DIFFERS}" >&2\n' if rc else 'echo "Stripe holds the catalogue the rate card gives."\n')
        + f"exit {rc}\n"
    )
    script.chmod(script.stat().st_mode | stat.S_IXUSR)
    return script


def _run(folder: Path, credentials: str, rc: int):
    (folder / "credentials.env").write_text(credentials)
    return play_tasks(
        folder,
        "peal_release",
        [COMPARE, REPORT],
        peal_root=str(folder),
        peal_compose_bin=str(_compose(folder, rc)),
    )


def test_a_server_that_bills_compares_with_the_new_image_and_only_reports(tmp_path: Path) -> None:
    ran = _run(tmp_path, "STRIPE_SECRET_KEY='sk_test_synthetic_release'\n", rc=1)

    assert ran.returncode == 0, ran.stdout + ran.stderr
    assert (tmp_path / "compose-args").read_text().split() == [
        "run",
        "--rm",
        "--no-deps",
        "-T",
        "server",
        "packages/peal-server/scripts/stripe-catalogue.ts",
        "--check",
    ]
    assert DIFFERS in ran.stdout
    assert "sudo peal-compose run --rm --no-deps server packages/peal-server/scripts/stripe-catalogue.ts" in ran.stdout
    assert "sk_test_synthetic_release" not in ran.stdout + ran.stderr
    assert recap_of(ran)["changed"] == 0


def test_a_catalogue_that_matches_is_not_reported(tmp_path: Path) -> None:
    ran = _run(tmp_path, "STRIPE_SECRET_KEY='sk_test_synthetic_release'\n", rc=0)

    assert ran.returncode == 0, ran.stdout + ran.stderr
    assert recap_of(ran)["skipped"] == 1


def test_a_server_that_does_not_bill_asks_stripe_nothing(tmp_path: Path) -> None:
    ran = _run(tmp_path, "STRIPE_SECRET_KEY=''\nRESEND_API_KEY='re_synthetic'\n", rc=1)

    assert ran.returncode == 0, ran.stdout + ran.stderr
    assert not (tmp_path / "compose-args").exists()
    assert recap_of(ran)["skipped"] == 1


def test_the_comparison_runs_before_the_old_server_is_replaced() -> None:
    names = [
        task["name"]
        for task in yaml.safe_load((INFRA / "roles" / "peal_release" / "tasks" / "main.yml").read_text())
    ]

    assert names.index("Point current at the release") < names.index(COMPARE)
    assert names.index(REPORT) < names.index("Stop the old server before Postgres restarts")
    assert names.index(REPORT) < names.index("Start the server, which migrates the database")
