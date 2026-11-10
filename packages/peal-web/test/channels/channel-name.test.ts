import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";
import { maxChannelLabelLength } from "peal-contract";

import { labelUpdateOf } from "#channels/channel-label.ts";
import {
  channelInitial,
  channelName,
  channelTitle,
} from "#channels/channel-name.ts";

const account = {
  displayName: "Peal Example",
  handle: "@peal_example@social.example",
  label: null,
};

const named = { ...account, label: "Client A" };

describe(channelName, () => {
  it("is the handle alone for a channel the workspace did not name", () => {
    expect(channelName(account)).toBe("@peal_example@social.example");
  });

  it("puts the workspace's name first and keeps the handle beside it", () => {
    expect(channelName(named)).toBe("Client A (@peal_example@social.example)");
  });
});

describe(channelTitle, () => {
  it("prefers the workspace's name, then the platform's, then the handle", () => {
    expect(channelTitle(named)).toBe("Client A");
    expect(channelTitle(account)).toBe("Peal Example");
    expect(channelTitle({ ...account, displayName: null })).toBe(
      "@peal_example@social.example"
    );
  });
});

describe(channelInitial, () => {
  it("skips a handle's at sign", () => {
    expect(channelInitial({ ...account, displayName: null })).toBe("P");
    expect(channelInitial(named)).toBe("C");
  });
});

describe(labelUpdateOf, () => {
  it("sends the name without the spaces around it", () => {
    expect(labelUpdateOf("  Client A ")).toStrictEqual(
      Option.some({ label: "Client A" })
    );
  });

  it("takes the name back for nothing but spaces", () => {
    expect(labelUpdateOf("   ")).toStrictEqual(Option.some({ label: null }));
  });

  it("sends nothing the contract would refuse", () => {
    expect(
      Option.isSome(labelUpdateOf("a".repeat(maxChannelLabelLength)))
    ).toBeTruthy();
    expect(
      Option.isNone(labelUpdateOf("a".repeat(maxChannelLabelLength + 1)))
    ).toBeTruthy();
  });
});
