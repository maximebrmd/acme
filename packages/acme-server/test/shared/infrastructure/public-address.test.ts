import { describe, expect, it } from "@effect/vitest";
import { NetAddress } from "effect/net";

import { isPublicAddress } from "#shared/infrastructure/platforms/outbound-guard.ts";

const ip = (address: string) => NetAddress.ipFromStringUnsafe(address);

describe(isPublicAddress, () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "255.255.255.255",
    "224.0.0.1",
    "192.0.2.1",
    "198.18.0.1",
    "::1",
    "::",
    "fe80::1",
    "fd00::1",
    "::ffff:10.0.0.1",
    "64:ff9b::7f00:1",
    "2002:a00:1::",
    "2001:db8::1",
  ])("refuses %s", (address) => {
    expect(isPublicAddress(ip(address))).toBeFalsy();
  });

  it.each([
    "93.184.215.14",
    "1.1.1.1",
    "2606:2800:21f:cb07::1",
    "::ffff:1.1.1.1",
  ])("accepts %s", (address) => {
    expect(isPublicAddress(ip(address))).toBeTruthy();
  });
});
