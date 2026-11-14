import { Schema } from "effect";

/**
 * A website would not be connected, for a reason its owner can fix:
 *
 * - `notWordPress`: the address leads to no WordPress REST API.
 * - `addressNotAllowed`: the site is not on HTTPS, on the default port, at
 *   a public address (the outbound guard refused it), or its home page
 *   names an API on another site.
 * - `credentialsRefused`: the site refused the user and the password.
 * - `cannotPublish`: the user may not publish posts or upload files.
 */
export class SiteRefused extends Schema.TaggedError<SiteRefused>()(
  "SiteRefused",
  {
    reason: Schema.Literals([
      "notWordPress",
      "addressNotAllowed",
      "credentialsRefused",
      "cannotPublish",
    ]),
  }
) {}
