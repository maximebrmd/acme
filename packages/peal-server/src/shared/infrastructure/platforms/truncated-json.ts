import { Option } from "effect";

// What closes an array or an object, by what opened it.
const closerOf = (bracket: string | undefined): string =>
  bracket === "[" ? "]" : "}";

interface Cut {
  /** Where the text is cut: after a whole element of an array. */
  readonly at: number;
  /** What closes every array and object open there, innermost first. */
  readonly closing: string;
}

/**
 * A JSON document that was cut off, as an answer larger than Peal reads
 * is, made whole again without what was lost: cut after the last element
 * an array holds whole, with every array and object open there closed.
 * An object is never cut between a key and its value, so every object
 * left holds whole values, but for the arrays that lost their end. None
 * when no array element was read whole, or when the text is not the start
 * of a JSON document.
 *
 * What comes back is still text a platform sent: decode it with a Schema.
 */
export const closedJson = (text: string): Option.Option<string> => {
  const open: string[] = [];
  let cut: Cut | undefined;
  let inString = false;
  let escaped = false;

  // After a whole value that is an array's element, the text can end.
  const mark = (at: number) => {
    if (open.at(-1) === "[") {
      cut = {
        at,
        closing: open
          .toReversed()
          .map((bracket) => closerOf(bracket))
          .join(""),
      };
    }
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
        mark(index + 1);
      }
    } else if (character === '"') {
      inString = true;
    } else if (character === "[" || character === "{") {
      open.push(character);
    } else if (character === "]" || character === "}") {
      if (open.length === 0 || closerOf(open.pop()) !== character) {
        return Option.none();
      }

      mark(index + 1);
    } else if (character === ",") {
      // A number, true, false or null ends at the comma after it.
      mark(index);
    }
  }

  return cut === undefined
    ? Option.none()
    : Option.some(
        `${text.slice(0, cut.at).replace(/,\s*$/u, "")}${cut.closing}`
      );
};
