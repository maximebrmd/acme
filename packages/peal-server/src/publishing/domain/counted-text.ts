import { Option, Schema } from "effect";

import { MastodonOptions } from "./mastodon-options.ts";
import type { TargetOptions } from "./target-options.ts";

const isMastodon = Schema.is(MastodonOptions);

/**
 * The text a platform's character limit counts on a channel, with the
 * options the post has there: the text itself, but on Mastodon, which
 * counts a content warning with the text (its `StatusLengthValidator`
 * joins `spoiler_text` and the text), the warning then the text, on every
 * part. The contract's `countedText` is the clients' copy.
 */
export const countedText = (
  text: string,
  options: Option.Option<TargetOptions>
): string =>
  options.pipe(
    Option.filter(isMastodon),
    Option.flatMap(({ contentWarning }) =>
      Option.fromUndefinedOr(contentWarning)
    ),
    Option.match({
      onNone: () => text,
      onSome: (warning) => `${warning}${text}`,
    })
  );
