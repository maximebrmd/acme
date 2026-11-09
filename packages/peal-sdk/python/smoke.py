"""The smoke test, which scripts/test.ts runs against a stand-in API: the
health check, the signed-in user with a bearer token, and the error a
refused token raises, through the wheel as PyPI ships it."""
import os

from peal import Peal
from peal.core.api_error import ApiError

base_url = os.environ["PEAL_API_URL"]
peal = Peal(base_url=base_url, token="peal_test")

peal.system.health()
me = peal.session.me()

assert me.user.email == "ada@example.test", me
assert me.impersonated_by is None and me.user.image is None, me
assert "post:schedule" in me.workspaces[0].permissions, me

try:
    Peal(base_url=base_url, token="refused").session.me()
except ApiError as error:
    assert error.status_code == 401, error
else:
    raise AssertionError("A refused token got an answer")

print("ok")
