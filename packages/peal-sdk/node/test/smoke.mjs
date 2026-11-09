// The smoke test, which scripts/test.ts runs against a stand-in API: the
// health check, the signed-in user with a bearer token, and the error a
// refused token raises, through the ES modules npm ships.
import { Peal, PealClient, PealError } from "../dist/esm/index.mjs";

const baseUrl = process.env.PEAL_API_URL;
const peal = new PealClient({ baseUrl, token: "peal_test" });

await peal.system.health();
const me = await peal.session.me();

if (
  me.user.email !== "ada@example.test" ||
  me.impersonatedBy !== null ||
  me.user.image !== null ||
  !me.workspaces[0].permissions.includes(Peal.Permission.PostSchedule)
) {
  throw new Error(`Unexpected answer: ${JSON.stringify(me)}`);
}

try {
  await new PealClient({ baseUrl, token: "refused" }).session.me();
  throw new Error("A refused token got an answer");
} catch (error) {
  if (!(error instanceof PealError) || error.statusCode !== 401) {
    throw error;
  }
}

console.log("ok");
