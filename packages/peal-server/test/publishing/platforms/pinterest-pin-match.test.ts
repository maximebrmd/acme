import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import { isSamePin } from "#publishing/infrastructure/platforms/pinterest/pinterest-pin-match.ts";
import type {
  ListedPin,
  SentPin,
} from "#publishing/infrastructure/platforms/pinterest/pinterest-pin-match.ts";

const since = DateTime.makeUnsafe("2026-03-01T10:00:00Z");

const sent: SentPin = {
  description: "Ripe tomatoes,  olive oil.\n",
  link: "https://Peal.example/recipes/",
  mediaType: "image",
  since,
  title: " Tomato salad",
};

const listed = (changes: Partial<ListedPin> = {}): ListedPin => ({
  createdAt: Option.some("2026-03-01T10:00:05+00:00"),
  description: "Ripe tomatoes, olive oil.",
  link: "https://peal.example/recipes",
  mediaType: Option.some("image"),
  title: "Tomato salad",
  ...changes,
});

describe(isSamePin, () => {
  it("takes a Pin made since with the same words, link and kind of media", () => {
    expect(isSamePin(sent, listed())).toBeTruthy();
    // Pinterest may not say what the Pin shows.
    expect(isSamePin(sent, listed({ mediaType: Option.none() }))).toBeTruthy();
    expect(
      isSamePin(
        { ...sent, description: "", link: "", title: "" },
        listed({ description: "", link: "", title: "" })
      )
    ).toBeTruthy();
  });

  it("leaves a Pin made before the attempt, or at a time it cannot read", () => {
    for (const createdAt of [
      Option.some("2026-03-01T09:59:59Z"),
      Option.some("yesterday"),
      Option.none<string>(),
    ]) {
      expect(isSamePin(sent, listed({ createdAt }))).toBeFalsy();
    }
  });

  it("leaves a Pin that differs in a word, its link or its media", () => {
    for (const other of [
      listed({ title: "Tomato salads" }),
      listed({ description: "Ripe tomatoes." }),
      listed({ link: "https://peal.example/recipes?page=2" }),
      listed({ link: "" }),
      listed({ mediaType: Option.some("video") }),
    ]) {
      expect(isSamePin(sent, other)).toBeFalsy();
    }
  });
});
