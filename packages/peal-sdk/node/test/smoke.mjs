// The smoke test, which scripts/test.ts runs against a stand-in API: the
// health check, then the signed-in user with a bearer token, through the
// package as npm ships it.
import { Configuration, SessionApi, SystemApi } from "../dist/index.js";

const configuration = new Configuration({
  accessToken: "peal_test",
  basePath: process.env.PEAL_API_URL,
});

await new SystemApi(configuration).health();
const me = await new SessionApi(configuration).sessionMe();

if (
  me.user.email !== "ada@example.test" ||
  me.impersonatedBy !== null ||
  me.user.image !== null ||
  !me.workspaces[0].permissions.includes("post:schedule")
) {
  throw new Error(`Unexpected answer: ${JSON.stringify(me)}`);
}

console.log("ok");
