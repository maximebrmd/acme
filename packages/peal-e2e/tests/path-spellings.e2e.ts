import { describe, test } from "@e2e-dev/web";
import { expect } from "e2e";

// A path that reads differently to cloudflared, which decodes it and
// resolves its dot segments before it picks the rule that says whether
// Access guards it, and to the routers, which keep `%2F` inside a segment:
// the web app's proxy and the server refuse it, whatever comes after.
describe("paths written to slip past the proxy", () => {
  test("are refused by the pages and the API", async ({ app }) => {
    const statusOf = async (path: string) => {
      const response = await fetch(`${app.baseUrl}${path}`, {
        redirect: "manual",
      });

      return response.status;
    };

    expect(await statusOf("/en/admin/users/x%2F..%2F..%2F..%2F..%2Fy")).toBe(
      400
    );
    expect(await statusOf("/admin/workspaces/x%5C..%5Cy")).toBe(400);

    const api = await fetch(
      `${app.baseUrl}/api/admin/users/x%2F..%2F..%2F..%2F..%2Fapi%2Fhealth`
    );

    expect(api.status).toBe(400);
    expect(await api.json()).toMatchObject({ code: "bad_request" });

    // A page as it is written still opens.
    expect(await statusOf("/sign-in")).toBe(200);
  });
});
