import { describe, expect, it } from "@effect/vitest";
import * as Contract from "peal-contract";

import {
  maxChannelSetNameLength,
  maxChannelSetsPerWorkspace,
  maxChannelsPerSet,
} from "#publishing/domain/channel-set.ts";
import {
  maxSignatureLength,
  maxSignatureNameLength,
  maxSignaturesPerWorkspace,
  signed,
} from "#publishing/domain/signature.ts";
import {
  maxTagNameLength,
  maxTagsPerPost,
  maxTagsPerWorkspace,
  TagColourSchema,
} from "#publishing/domain/tag.ts";

// The contract copies the limits of what a workspace saves, and how a
// signature goes under a text, for clients that check or insert before
// they send: both must say the same.

describe("the contract's copy of tags, signatures and channel sets", () => {
  it("has the domain's limits", () => {
    expect({
      maxChannelSetNameLength: Contract.maxChannelSetNameLength,
      maxChannelSetsPerWorkspace: Contract.maxChannelSetsPerWorkspace,
      maxChannelsPerSet: Contract.maxChannelsPerSet,
      maxSignatureLength: Contract.maxSignatureLength,
      maxSignatureNameLength: Contract.maxSignatureNameLength,
      maxSignaturesPerWorkspace: Contract.maxSignaturesPerWorkspace,
      maxTagNameLength: Contract.maxTagNameLength,
      maxTagsPerPost: Contract.maxTagsPerPost,
      maxTagsPerWorkspace: Contract.maxTagsPerWorkspace,
    }).toStrictEqual({
      maxChannelSetNameLength,
      maxChannelSetsPerWorkspace,
      maxChannelsPerSet,
      maxSignatureLength,
      maxSignatureNameLength,
      maxSignaturesPerWorkspace,
      maxTagNameLength,
      maxTagsPerPost,
      maxTagsPerWorkspace,
    });
  });

  it("has the domain's palette, in its order", () => {
    expect(Contract.TagColourSchema.literals).toStrictEqual(
      TagColourSchema.literals
    );
  });

  it.each([
    ["Hello", "— The studio"],
    ["Hello\n\n  ", "— The studio"],
    ["", "— The studio"],
    ["  \n", "— The studio"],
    ["Hello\n\n— The studio", "— The studio"],
    ["Hello\n\n— The studio\n", "— The studio"],
    ["Hello\n\nCafé", "Café"],
    ["— The studio\n\nHello", "— The studio"],
  ])("signs %j with %j as the domain does", (text, signature) => {
    expect(Contract.signedText(text, signature)).toBe(signed(text, signature));
  });
});
