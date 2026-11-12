import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  AccountSettingsSchema,
  EnvironmentSettingsSchema,
} from "../src/settings.ts";

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

const account = (uptime: Readonly<Record<string, string>>) => ({
  accountId: "account-synthetic",
  domain: "example.test",
  linkDomain: "short.test",
  ownerName: "Owner",
  uptime,
  zoneId: "zone-synthetic",
});

const decodeAccount = Schema.decodeUnknownSync(AccountSettingsSchema);

describe("the uptime server's setting", () => {
  const uptime = {
    hostname: "uptime",
    ipv4: "192.0.2.10",
    ipv6: "2001:db8::10",
    statusHostname: "status",
  };

  it("is optional, and takes IPv6 as optional too", () => {
    const { uptime: _, ...without } = account(uptime);
    expect(decodeAccount(without).uptime).toBeUndefined();
    const { ipv6: __, ...ipv4Only } = uptime;
    expect(decodeAccount(account(ipv4Only)).uptime).toStrictEqual(ipv4Only);
    expect(decodeAccount(account(uptime)).uptime).toStrictEqual(uptime);
  });

  it("refuses an address of the wrong family, and a name deeper than the first level", () => {
    expect(() =>
      decodeAccount(account({ ...uptime, ipv4: "2001:db8::10" }))
    ).toThrow(Error);
    expect(() =>
      decodeAccount(account({ ...uptime, ipv6: "192.0.2.10" }))
    ).toThrow(Error);
    expect(() =>
      decodeAccount(account({ ...uptime, ipv4: "192.0.2.300" }))
    ).toThrow(Error);
    expect(() =>
      decodeAccount(account({ ...uptime, statusHostname: "status.uptime" }))
    ).toThrow(Error);
    expect(() => decodeAccount(account({ ...uptime, hostname: "@" }))).toThrow(
      Error
    );
  });
});
