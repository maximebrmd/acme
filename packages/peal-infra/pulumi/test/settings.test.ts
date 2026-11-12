import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { EnvironmentSettingsSchema } from "../src/settings.ts";

const settings = (site: string) => ({
  accountId: "account-synthetic",
  accountStack: "organization/peal-account/peal",
  domain: "example.test",
  environment: "production",
  hostnames: {
    app: "app",
    docs: "docs",
    grafana: "grafana",
    site,
    ssh: "ssh",
  },
  shortLinkHost: "short.test",
  zoneId: "zone-synthetic",
});

const decode = Schema.decodeUnknownSync(EnvironmentSettingsSchema);

describe("an environment's host names", () => {
  it("takes a first-level label, or @ for the bare domain", () => {
    expect(decode(settings("@")).hostnames.site).toBe("@");
    expect(decode(settings("sandbox-site")).hostnames.site).toBe(
      "sandbox-site"
    );
  });

  it("refuses an empty label, and a name deeper than the first level", () => {
    expect(() => decode(settings(""))).toThrow(Error);
    expect(() => decode(settings("www.docs"))).toThrow(Error);
    expect(() => decode(settings("-site"))).toThrow(Error);
  });
});
