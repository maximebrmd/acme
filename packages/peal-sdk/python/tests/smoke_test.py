"""The smoke test, which scripts/test.ts runs against a stand-in API: the
health check, then the signed-in user with a bearer token, through the wheel
as PyPI ships it."""

import os

import peal

configuration = peal.Configuration(host=os.environ["PEAL_API_URL"], access_token="peal_test")

with peal.ApiClient(configuration) as client:
    peal.SystemApi(client).health()
    me = peal.SessionApi(client).session_me()

assert me.user.email == "ada@example.test", me
assert me.impersonated_by is None and me.user.image is None, me
assert "post:schedule" in me.workspaces[0].permissions, me
print("ok")
