import { describe, expect, it } from "@effect/vitest";
import { Result } from "effect";

import {
  checkProviderAddress,
  checkProviderKey,
  checkProviderModel,
  maxProviderAddressLength,
  maxProviderKeyLength,
  maxProviderModelLength,
  originOfProvider,
} from "#assistant/domain/image-provider.ts";

const outside = { production: false };
const production = { production: true };

const reasonOf = (text: string, where = production) =>
  Result.match(checkProviderAddress(text, where), {
    onFailure: ({ reason }) => reason,
    onSuccess: (address) => `accepted ${address}`,
  });

describe(checkProviderAddress, () => {
  it("takes an absolute https address, without the slashes that end it", () => {
    expect(reasonOf("https://images.example.com/v1/")).toBe(
      "accepted https://images.example.com/v1"
    );
    expect(reasonOf("https://images.example.com/v1///")).toBe(
      "accepted https://images.example.com/v1"
    );
    expect(reasonOf("https://images.example.com")).toBe(
      "accepted https://images.example.com"
    );
    expect(reasonOf("https://images.example.com/")).toBe(
      "accepted https://images.example.com"
    );
  });

  it("refuses http in production and takes it outside", () => {
    expect(reasonOf("http://images.example.com/v1")).toBe("notHttps");
    expect(reasonOf("http://images.example.com/v1", outside)).toBe(
      "accepted http://images.example.com/v1"
    );
  });

  it("refuses an address of another scheme anywhere", () => {
    expect(reasonOf("ftp://images.example.com/v1", outside)).toBe("notHttps");
    expect(reasonOf("file:///etc/passwd", outside)).toBe("notHttps");
  });

  it("refuses a user or a password", () => {
    expect(reasonOf("https://user@images.example.com/v1")).toBe("credentials");
    expect(reasonOf("https://user:secret@images.example.com/v1")).toBe(
      "credentials"
    );
  });

  it("refuses a query or a fragment", () => {
    expect(reasonOf("https://images.example.com/v1?key=synthetic")).toBe(
      "queryOrFragment"
    );
    expect(reasonOf("https://images.example.com/v1#top")).toBe(
      "queryOrFragment"
    );
    expect(reasonOf("https://images.example.com/v1?")).toBe("queryOrFragment");
  });

  it("refuses an address longer than 2,048 characters as written", () => {
    const base = "https://images.example.com/";
    const longest = `${base}${"a".repeat(maxProviderAddressLength - base.length)}`;

    expect(reasonOf(longest)).toBe(`accepted ${longest}`);
    expect(reasonOf(`${longest}a`)).toBe("tooLong");
  });

  it("refuses what is not an absolute address", () => {
    for (const text of ["", "images.example.com/v1", "/v1", "https://"]) {
      expect(reasonOf(text)).toBe("malformed");
    }
  });

  it("names the origin a key is bound to", () => {
    const address = Result.getOrThrow(
      checkProviderAddress("https://Images.Example.com:443/v1/", production)
    );

    expect(address).toBe("https://images.example.com/v1");
    expect(originOfProvider(address)).toBe("https://images.example.com");
  });
});

describe(checkProviderModel, () => {
  it("takes one line of 1 to 200 characters", () => {
    expect(Result.getOrThrow(checkProviderModel("synthetic-image-model"))).toBe(
      "synthetic-image-model"
    );
    expect(
      Result.isSuccess(checkProviderModel("m".repeat(maxProviderModelLength)))
    ).toBeTruthy();
  });

  it("refuses a blank, overlong or multi-line model", () => {
    for (const text of [
      "",
      "   ",
      "m".repeat(maxProviderModelLength + 1),
      "synthetic\nmodel",
      "synthetic\u0000model",
    ]) {
      expect(Result.isFailure(checkProviderModel(text))).toBeTruthy();
    }
  });
});

describe(checkProviderKey, () => {
  it("takes 1 to 500 visible characters", () => {
    expect(
      Result.isSuccess(checkProviderKey("synthetic-workspace-image-key"))
    ).toBeTruthy();
    expect(
      Result.isSuccess(checkProviderKey("k".repeat(maxProviderKeyLength)))
    ).toBeTruthy();
  });

  it("refuses a blank, overlong or multi-line key", () => {
    for (const text of [
      "",
      "k".repeat(maxProviderKeyLength + 1),
      "synthetic key",
      "synthetic\nkey",
    ]) {
      expect(Result.isFailure(checkProviderKey(text))).toBeTruthy();
    }
  });
});
