import { describe, expect, it } from "@effect/vitest";
import { Exit, Option } from "effect";
import {
  ChannelSetNameTaken,
  Forbidden,
  SignatureNotFound,
  TagNameTaken,
  TooManyChannelSets,
  TooManySignatures,
  TooManyTags,
  UnknownChannels,
} from "peal-contract";

import { savedItemErrorOf } from "#settings/saved-item-error.ts";

const message = "A synthetic refusal";

describe(savedItemErrorOf, () => {
  it("has nothing to say of a call that worked", () => {
    expect(savedItemErrorOf(Exit.succeed("done"))).toStrictEqual(Option.none());
  });

  it.each([
    ["a name already taken", new TagNameTaken({ message }), "nameTaken"],
    ["a set's name too", new ChannelSetNameTaken({ message }), "nameTaken"],
    ["something gone", new SignatureNotFound({ message }), "notFound"],
    ["a role that may not", new Forbidden({ message }), "forbidden"],
    [
      "channels disconnected",
      new UnknownChannels({ channelIds: ["gone"], message }),
      "unknownChannels",
    ],
  ])("explains %s", (_, refusal, key) => {
    expect(savedItemErrorOf(Exit.fail(refusal))).toStrictEqual(
      Option.some({ key })
    );
  });

  it.each([
    new TooManyTags({ allowed: 100, message }),
    new TooManySignatures({ allowed: 100, message }),
    new TooManyChannelSets({ allowed: 100, message }),
  ])("says how many the workspace may keep: $_tag", (refusal) => {
    expect(savedItemErrorOf(Exit.fail(refusal))).toStrictEqual(
      Option.some({ allowed: 100, key: "tooMany" })
    );
  });

  it("calls anything else unknown: another error, or a defect", () => {
    expect(savedItemErrorOf(Exit.fail({ _tag: "SomethingNew" }))).toStrictEqual(
      Option.some({ key: "unknown" })
    );

    expect(savedItemErrorOf(Exit.die("the server is down"))).toStrictEqual(
      Option.some({ key: "unknown" })
    );
  });
});
