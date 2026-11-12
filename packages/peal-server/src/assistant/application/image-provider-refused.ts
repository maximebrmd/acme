import { Schema } from "effect";

/**
 * The image provider the workspace brought gave no image with its
 * settings, and Peal's own model is not used instead:
 *
 * - `settingsRefused`: the provider refused the key, the account, the
 *   model or the address (`status` 401, 402, 403 or 404).
 * - `redirected`: the provider answered with a redirect (`status` 3xx),
 *   which Peal never follows: the address lacks the API's host or version.
 * - `addressRefused`: the address is one Peal sends nothing to (not
 *   public, or a name that does not resolve); `status` is null.
 * - `keyUnreadable`: the stored key no longer decrypts, and must be typed
 *   again; `status` is null.
 *
 * Nothing of Peal's allowance was spent, and the next request tries again:
 * the workspace may have fixed its account. It carries no body: a
 * provider's error can quote the prompt and the key.
 */
export class ImageProviderRefused extends Schema.TaggedError<ImageProviderRefused>()(
  "ImageProviderRefused",
  {
    reason: Schema.Literals([
      "settingsRefused",
      "redirected",
      "addressRefused",
      "keyUnreadable",
    ]),
    status: Schema.NullOr(Schema.Int),
  }
) {
  override get message(): string {
    return `The workspace's image provider gave no image: ${this.reason}`;
  }
}
