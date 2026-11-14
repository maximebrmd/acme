import { describe, expect, it } from "@effect/vitest";

import {
  addChoice,
  changeChoice,
  durationChoices,
  newPoll,
  pollContentOf,
  pollFitsOn,
  pollOf,
  pollProblemsOn,
  removeChoice,
} from "#posts/poll.ts";

const yesNo = {
  choices: ["Yes", "No"],
  durationMinutes: 1440,
  multipleChoice: false,
};

describe("a poll as the composer edits it", () => {
  it("starts with two empty choices, open a day", () => {
    expect(newPoll()).toStrictEqual({
      choices: ["", ""],
      durationMinutes: 1440,
      multipleChoice: false,
    });
  });

  it("is read from a post's content, none without one", () => {
    expect(
      pollOf({
        content: {
          media: [],
          overrides: [],
          poll: { choices: ["A", "B"], durationMinutes: 60 },
          text: "Which?",
        },
      })
    ).toStrictEqual({
      choices: ["A", "B"],
      durationMinutes: 60,
      multipleChoice: false,
    });
    expect(
      pollOf({ content: { media: [], overrides: [], text: "None" } })
    ).toBeUndefined();
    expect(pollOf(undefined)).toBeUndefined();
  });

  it("goes in the content only when there is one, several picks only when asked", () => {
    expect(pollContentOf(undefined)).toStrictEqual({});
    expect(pollContentOf(yesNo)).toStrictEqual({
      poll: { choices: ["Yes", "No"], durationMinutes: 1440 },
    });
    expect(
      pollContentOf({ ...yesNo, multipleChoice: true }).poll
    ).toStrictEqual({
      choices: ["Yes", "No"],
      durationMinutes: 1440,
      multipleChoice: true,
    });
  });

  it("adds a choice up to four, and removes one down to two", () => {
    const four = addChoice(addChoice(yesNo));

    expect(four.choices).toStrictEqual(["Yes", "No", "", ""]);
    expect(addChoice(four)).toBe(four);
    expect(removeChoice(four, 1).choices).toStrictEqual(["Yes", "", ""]);
    expect(removeChoice(yesNo, 0)).toBe(yesNo);
    expect(changeChoice(yesNo, 1, "Maybe").choices).toStrictEqual([
      "Yes",
      "Maybe",
    ]);
  });

  it("offers the usual times, with the one it has when it is another", () => {
    expect(durationChoices(1440)).toContain(10_080);
    expect(durationChoices(90)).toContain(90);
  });
});

describe("what a platform refuses in a poll", () => {
  it("is nothing where the poll fits", () => {
    expect(pollProblemsOn("mastodon", yesNo, 0)).toStrictEqual([]);
  });

  it("is the poll itself where Peal sends none", () => {
    expect(pollProblemsOn("bluesky", yesNo, 0)).toStrictEqual([
      { _tag: "notSupported" },
    ]);
  });

  it("names each bound it passes, as the server does", () => {
    expect(
      pollProblemsOn(
        "x",
        {
          choices: ["A", "a".repeat(26), ""],
          durationMinutes: 20_160,
          multipleChoice: true,
        },
        1
      )
    ).toStrictEqual([
      { _tag: "choiceLength", choice: 2, length: 26, maximum: 25 },
      { _tag: "choiceLength", choice: 3, length: 0, maximum: 25 },
      { _tag: "duration", maximum: 10_080, minimum: 5 },
      { _tag: "multipleChoice" },
      { _tag: "withMedia" },
    ]);
    expect(
      pollProblemsOn("mastodon", { ...yesNo, choices: ["A", "B", "A"] }, 0)
    ).toStrictEqual([{ _tag: "choiceRepeated", choice: 3 }]);
    expect(
      pollProblemsOn("threads", { ...yesNo, choices: ["Alone"] }, 0)
    ).toStrictEqual([{ _tag: "choiceCount", maximum: 4, minimum: 2 }]);
  });
});

describe("whether the post's channels take its poll", () => {
  const channels = [
    { id: "a", platform: "mastodon" as const },
    { id: "b", platform: "x" as const },
  ];

  it("is so without a poll, and where every channel takes it", () => {
    expect(
      pollFitsOn(
        channels,
        undefined,
        () => 1,
        () => {}
      )
    ).toBeTruthy();
    expect(
      pollFitsOn(
        channels,
        yesNo,
        () => 0,
        () => {}
      )
    ).toBeTruthy();
  });

  it("is not where one channel shows a file beside it", () => {
    expect(
      pollFitsOn(
        channels,
        yesNo,
        (id) => (id === "b" ? 1 : 0),
        () => {}
      )
    ).toBeFalsy();
  });
});
