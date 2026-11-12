import { Schema } from "effect";

/** Another short link holds the code just drawn: draw again. */
export class CodeTaken extends Schema.TaggedError<CodeTaken>()(
  "CodeTaken",
  {}
) {}
