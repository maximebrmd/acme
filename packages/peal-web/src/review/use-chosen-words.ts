"use client";

import { maxQuoteLength } from "peal-contract";
import { useEffect, useState } from "react";

import type { ChosenWords } from "#review/threads.ts";

// The element that holds a channel's text carries its channel's id.
const channelAttribute = "data-review-channel";

/** What marks the element that holds a channel's text. */
export const channelText = (channelId: string) => ({
  [channelAttribute]: channelId,
});

const elementOf = (node: Node | null): Element | null => {
  if (node === null) {
    return null;
  }

  return node instanceof Element ? node : node.parentElement;
};

// The words selected in the page, when they lie within one channel's text:
// where they start there, counted in the text itself, and what they say.
const chosenIn = (selection: Selection | null): ChosenWords | null => {
  if (
    selection === null ||
    selection.rangeCount === 0 ||
    selection.isCollapsed
  ) {
    return null;
  }

  const range = selection.getRangeAt(0);

  const holder = elementOf(range.startContainer)?.closest(
    `[${channelAttribute}]`
  );

  const channelId = holder?.getAttribute(channelAttribute);

  if (
    holder === null ||
    holder === undefined ||
    channelId === null ||
    channelId === undefined ||
    !holder.contains(range.endContainer)
  ) {
    return null;
  }

  const before = document.createRange();

  before.selectNodeContents(holder);
  before.setEnd(range.startContainer, range.startOffset);

  const quote = range.toString();

  return quote.trim() === "" || quote.length > maxQuoteLength
    ? null
    : { channelId, quote, start: before.toString().length };
};

/**
 * The words the reader last selected in a channel's text, to comment on
 * them, and how to forget them. They stay chosen once the selection ends,
 * as it does when the reader starts typing a comment. Texts are rendered as
 * plain text nodes, so what the page counts is what the post says.
 */
export const useChosenWords = (): readonly [ChosenWords | null, () => void] => {
  const [chosen, setChosen] = useState<ChosenWords | null>(null);

  useEffect(() => {
    const read = () => {
      const words = chosenIn(document.getSelection());

      if (words !== null) {
        setChosen(words);
      }
    };

    document.addEventListener("selectionchange", read);

    return () => {
      document.removeEventListener("selectionchange", read);
    };
  }, []);

  const clear = () => {
    setChosen(null);
    document.getSelection()?.removeAllRanges();
  };

  return [chosen, clear];
};
