"""The system role on an image whose cloud-init manages /etc/hosts
(`manage_etc_hosts`), as some providers' images do: cloud-init then writes
the file again at every boot from its template, with the name the provider
gave the server, and the role's own line would last until the next reboot.
The role's tasks run here with Ansible itself, on a folder that stands for
the server's /etc."""

from __future__ import annotations

from pathlib import Path

import jinja2
import pytest
import yaml

from conftest import run_tasks, task

# What the role does about the host name's line, in its order.
TASKS = [
    "Resolve the host name locally",
    "Look for cloud-init",
    "Keep cloud-init from rewriting the hosts file",
    "Look for cloud-init's hosts template",
    "Resolve the host name in cloud-init's hosts template",
]

# The line cloud-init's template for Debian and Ubuntu holds for the
# server's own name, and the ones around it.
TEMPLATE = """## template:jinja
{#
Rendered by cloud-init where manage_etc_hosts is on.
-#}
# Written by cloud-init at every boot.
127.0.1.1 {{fqdn}} {{hostname}}
127.0.0.1 localhost

::1 localhost ip6-localhost ip6-loopback
"""

# The name a provider gives a server, which cloud-init reads from it.
PROVIDER = {"fqdn": "vm-4f2a.provider.example", "hostname": "vm-4f2a"}


def _as_cloud_init_renders(template: Path) -> str:
    """The hosts file cloud-init writes from its template at boot: Jinja,
    after the line that says so."""
    header, body = template.read_text().split("\n", 1)
    assert header == "## template:jinja"
    return jinja2.Environment(autoescape=False).from_string(body).render(**PROVIDER)


def _server(tmp_path: Path, *, cloud_init: bool) -> Path:
    """A folder that stands for a new server's /etc, as an image with
    cloud-init leaves it after its first boot."""
    etc = tmp_path / "etc"
    etc.mkdir()
    if cloud_init:
        (etc / "cloud" / "cloud.cfg.d").mkdir(parents=True)
        (etc / "cloud" / "templates").mkdir()
        (etc / "cloud" / "cloud.cfg.d" / "90_dpkg.cfg").write_text("datasource_list: [ NoCloud, None ]\n")
        (etc / "cloud" / "cloud.cfg.d" / "99_provider.cfg").write_text("manage_etc_hosts: true\n")
        template = etc / "cloud" / "templates" / "hosts.debian.tmpl"
        template.write_text(TEMPLATE)
        (etc / "hosts").write_text(_as_cloud_init_renders(template))
    else:
        (etc / "hosts").write_text("127.0.0.1 localhost\n")
    return etc


def _converge(tmp_path: Path, etc: Path, *, check: bool = False) -> dict[str, int]:
    return run_tasks(
        tmp_path,
        "system",
        TASKS,
        check=check,
        system_hosts_file=str(etc / "hosts"),
        system_cloud_init_dir=str(etc / "cloud"),
    )


def test_the_role_s_paths_are_the_server_s() -> None:
    defaults = yaml.safe_load((Path(__file__).parent.parent / "roles" / "system" / "defaults" / "main.yml").read_text())

    assert defaults["system_hosts_file"] == "/etc/hosts"
    assert defaults["system_cloud_init_dir"] == "/etc/cloud"


def test_the_host_line_survives_a_boot_where_cloud_init_writes_the_hosts_file(tmp_path: Path) -> None:
    """Whatever turned manage_etc_hosts on, the image's own settings or what
    the provider sends at boot, which no file on the server overrides."""
    etc = _server(tmp_path, cloud_init=True)
    assert "127.0.1.1 vm-4f2a.provider.example vm-4f2a" in (etc / "hosts").read_text()

    _converge(tmp_path, etc)

    assert "127.0.1.1 peal-production\n" in (etc / "hosts").read_text()
    rewritten = _as_cloud_init_renders(etc / "cloud" / "templates" / "hosts.debian.tmpl")
    assert "127.0.1.1 peal-production\n" in rewritten
    assert "vm-4f2a" not in rewritten
    assert "127.0.0.1 localhost\n" in rewritten


def test_cloud_init_is_told_to_leave_the_hosts_file_and_the_host_name(tmp_path: Path) -> None:
    """In the settings cloud-init reads last on the server, after the
    image's and the provider's own files."""
    etc = _server(tmp_path, cloud_init=True)

    _converge(tmp_path, etc)

    settings = sorted((etc / "cloud" / "cloud.cfg.d").glob("*.cfg"))
    assert settings[-1].name == "zz-peal.cfg"
    assert yaml.safe_load(settings[-1].read_text()) == {"manage_etc_hosts": False, "preserve_hostname": True}


def test_a_second_run_changes_nothing(tmp_path: Path) -> None:
    etc = _server(tmp_path, cloud_init=True)

    first = _converge(tmp_path, etc)
    second = _converge(tmp_path, etc)

    assert first["changed"] == 3
    assert second["changed"] == 0
    assert second["ok"] == first["ok"]


def test_a_boot_between_two_runs_changes_nothing(tmp_path: Path) -> None:
    """The next run after a reboot finds its line: the two no longer take
    turns at the file."""
    etc = _server(tmp_path, cloud_init=True)
    _converge(tmp_path, etc)

    (etc / "hosts").write_text(_as_cloud_init_renders(etc / "cloud" / "templates" / "hosts.debian.tmpl"))

    assert _converge(tmp_path, etc)["changed"] == 0


def test_check_mode_works_on_a_new_server_and_writes_nothing(tmp_path: Path) -> None:
    etc = _server(tmp_path, cloud_init=True)
    before = {path: path.read_text() for path in etc.rglob("*") if path.is_file()}

    recap = _converge(tmp_path, etc, check=True)

    assert recap["changed"] == 3
    assert recap["failed"] == 0
    assert {path: path.read_text() for path in etc.rglob("*") if path.is_file()} == before


@pytest.mark.parametrize("check", [False, True])
def test_a_server_without_cloud_init_gets_its_host_line_alone(tmp_path: Path, check: bool) -> None:
    etc = _server(tmp_path, cloud_init=False)

    recap = _converge(tmp_path, etc, check=check)

    assert recap["changed"] == 1
    assert recap["skipped"] == 2
    assert not (etc / "cloud").exists()
    assert ("127.0.1.1 peal-production\n" in (etc / "hosts").read_text()) is not check


def test_cloud_init_s_template_gets_the_line_the_hosts_file_gets() -> None:
    hosts = task("system", "Resolve the host name locally")["ansible.builtin.lineinfile"]
    template = task("system", "Resolve the host name in cloud-init's hosts template")["ansible.builtin.lineinfile"]

    assert template["regexp"] == hosts["regexp"]
    assert template["line"] == hosts["line"]
