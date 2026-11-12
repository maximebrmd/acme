import { Schema } from "effect";

/**
 * The image provider the workspace brought refused its settings: its key,
 * its account, its model or its address (`status` 401, 402, 403 or 404),
 * or the address is one Peal sends nothing to (`status` null: not public,
 * or a name that does not resolve). Nothing of Peal's allowance was spent,
 * and the next request tries again: the workspace may have fixed its
 * account. It carries no body: a provider's error can quote the prompt and
 * the key.
 */
export class ImageProviderRefused extends Schema.TaggedError<ImageProviderRefused>()(
  "ImageProviderRefused",
  { status: Schema.NullOr(Schema.Int) }
) {
  override get message(): string {
    return this.status === null
      ? "The workspace's image provider is at an address Peal sends nothing to"
      : `The workspace's image provider refused its settings (${this.status})`;
  }
}
