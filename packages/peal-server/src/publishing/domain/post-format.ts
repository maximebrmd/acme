import { Option, Schema } from "effect";

import { FacebookOptions } from "./facebook-options.ts";
import { InstagramOptions } from "./instagram-options.ts";
import type { TargetOptions } from "./target-options.ts";

/**
 * A kind of post whose rules differ from a feed post's, chosen by the
 * options' `format`, never guessed from the files: an Instagram or a
 * Facebook Page `story`, a Facebook `reel`. A feed post is no format.
 */
export const PostFormatSchema = Schema.Literals(["story", "reel"]);

export type PostFormat = typeof PostFormatSchema.Type;

const isInstagram = Schema.is(InstagramOptions);

const isFacebook = Schema.is(FacebookOptions);

const isFormat = Schema.is(PostFormatSchema);

/**
 * The format the options choose: none for a feed post, whether `feed` is
 * chosen or nothing is, and for a platform without formats.
 */
export const postFormatOf = (
  options: Option.Option<TargetOptions>
): Option.Option<PostFormat> =>
  options.pipe(
    Option.filter((chosen) => isInstagram(chosen) || isFacebook(chosen)),
    Option.flatMapNullishOr((chosen) =>
      "format" in chosen ? chosen.format : undefined
    ),
    Option.filter(isFormat)
  );
