"""The release's steps on Postgres (roles/peal_release), run as written
against the image postgres.Dockerfile builds on, in a container of their
own: what they read, and how they set the password a restored database
keeps from the server it came from."""

from __future__ import annotations

import secrets
import shutil
import subprocess
import time
from collections.abc import Iterator
from dataclasses import dataclass

import pytest

from conftest import INFRA, command_of, stdin_of, task

DOCKERFILE = INFRA.parent.parent / "peal-docker" / "postgres.Dockerfile"

IMAGE = next(
    line.split()[1] for line in DOCKERFILE.read_text().splitlines() if line.startswith("FROM ")
)


def _docker_runs() -> bool:
    return (
        shutil.which("docker") is not None
        and subprocess.run(["docker", "info"], capture_output=True, check=False).returncode == 0
    )


pytestmark = pytest.mark.skipif(not _docker_runs(), reason="Docker is not running")

# The password secrets.env holds, and the one of the server a backup came from.
GENERATED = f"generated-{secrets.token_hex(8)}"
RESTORED = f"restored-{secrets.token_hex(8)}"

# Stands for peal-compose in the tasks: `<it> exec -T postgres …` runs in the
# test's container.
COMPOSE = "peal-compose"


@dataclass(frozen=True)
class Postgres:
    """The test's Postgres: a container named as Compose names the stack's,
    on a network where `postgres` names it."""

    project: str
    network: str
    container: str


def _run(command: list[str], stdin: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, input=stdin, capture_output=True, text=True, check=False)


def _psql(postgres: Postgres, statement: str) -> None:
    """Runs a statement as the image's superuser, over the trusted socket."""
    _run(["docker", "exec", postgres.container, "psql", "--username", "peal", "--dbname", "peal",
          "--set", "ON_ERROR_STOP=1", "--command", statement]).check_returncode()


@pytest.fixture(scope="module")
def postgres() -> Iterator[Postgres]:
    project = f"peal-infra-test-{secrets.token_hex(4)}"
    stack = Postgres(project, f"{project}_default", f"{project}-postgres-1")
    _run(["docker", "network", "create", stack.network]).check_returncode()
    try:
        _run(["docker", "run", "--detach", "--name", stack.container, "--network", stack.network,
              "--network-alias", "postgres", "--env", "POSTGRES_USER=peal",
              "--env", "POSTGRES_DB=peal", "--env", f"POSTGRES_PASSWORD={GENERATED}",
              IMAGE]).check_returncode()
        # Ready once it answers over the network: while the image initialises
        # the database, its server listens on the socket alone.
        for _ in range(120):
            if _signs_in(stack, GENERATED):
                break
            time.sleep(0.5)
        else:
            pytest.fail("Postgres did not start")
        yield stack
    finally:
        _run(["docker", "rm", "--force", stack.container])
        _run(["docker", "network", "rm", stack.network])


def _signs_in(postgres: Postgres, password: str) -> bool:
    """Whether the server, another container on the network, signs in with
    this password, as DATABASE_URL says."""
    return _run(["docker", "run", "--rm", "--network", postgres.network, IMAGE, "psql",
                 f"postgres://peal:{password}@postgres:5432/peal", "--command", "SELECT 1"]).returncode == 0


def _step(postgres: Postgres, name: str) -> subprocess.CompletedProcess[str]:
    """Runs a release task's command as the release would, in the test's
    stack."""
    found = task("peal_release", name)
    command = command_of(
        found,
        peal_compose_bin=COMPOSE,
        peal_compose_project=postgres.project,
        peal_release_built={"postgres": IMAGE},
    )
    if command[:4] == [COMPOSE, "exec", "-T", "postgres"]:
        command = ["docker", "exec", "--interactive", postgres.container, *command[4:]]
    return _run(command, stdin_of(found))


@pytest.fixture
def restored(postgres: Postgres) -> Iterator[Postgres]:
    """The stack with the password of the server the database came from."""
    _psql(postgres, f"ALTER ROLE peal PASSWORD '{RESTORED}'")
    yield postgres
    _psql(postgres, f"ALTER ROLE peal PASSWORD '{GENERATED}'")


def test_the_check_refuses_the_restored_password(restored: Postgres) -> None:
    assert not _signs_in(restored, GENERATED)

    assert _step(restored, "Check the database password").returncode != 0


def test_the_check_accepts_the_generated_password(postgres: Postgres) -> None:
    assert _step(postgres, "Check the database password").returncode == 0


def test_setting_the_password_lets_the_server_sign_in(restored: Postgres) -> None:
    _step(restored, "Set the database password to the generated one").check_returncode()

    assert _signs_in(restored, GENERATED)
    assert _step(restored, "Check the database password").returncode == 0


def test_setting_the_password_logs_it_nowhere(restored: Postgres) -> None:
    """Not in Postgres's log, even where it logs every statement, nor on a
    command line, where any process on the host could read it."""
    found = task("peal_release", "Set the database password to the generated one")
    _psql(restored, "ALTER SYSTEM SET log_statement = 'all'")
    _psql(restored, "SELECT pg_reload_conf()")
    try:
        _step(restored, "Set the database password to the generated one").check_returncode()
    finally:
        _psql(restored, "ALTER SYSTEM RESET log_statement")
        _psql(restored, "SELECT pg_reload_conf()")
    logs = _run(["docker", "logs", restored.container])

    assert GENERATED not in logs.stdout + logs.stderr
    assert all("POSTGRES_PASSWORD" not in part for part in command_of(found, peal_compose_bin=COMPOSE))


def test_reading_what_postgres_runs_shows_no_secret(postgres: Postgres) -> None:
    """The release compares images and settings, and registers what it reads,
    which Ansible prints with -v: never the container's environment."""
    running = _step(postgres, "Read what Postgres runs")
    to_run = _step(postgres, "Read what Postgres is to run")

    assert running.returncode == 0
    assert GENERATED not in running.stdout + running.stderr
    assert running.stdout.split()[0] == to_run.stdout.strip()
