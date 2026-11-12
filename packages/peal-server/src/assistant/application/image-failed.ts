import { Schema } from "effect";

/**
 * The image model gave no image the assistant can use:
 *
 * - `unreachable`: the provider could not be reached, was rate limited or
 *   failed. The request did not run, so it does not count toward the quota.
 * - `timedOut`: the provider did not answer in time. It may have made the
 *   image all the same, so the request counts.
 * - `refused`: the provider refused the request, under its content rules
 *   or for a size its model does not make.
 * - `unusableAnswer`: the provider answered, but not with an image the
 *   library takes.
 *
 * It carries no cause: a provider's error can quote the prompt, which is
 * never logged.
 */
export class ImageFailed extends Schema.TaggedError<ImageFailed>()(
  "ImageFailed",
  {
    reason: Schema.Literals([
      "unreachable",
      "timedOut",
      "refused",
      "unusableAnswer",
    ]),
  }
) {
  override get message(): string {
    return `The image model gave no usable image: ${this.reason}`;
  }
}
