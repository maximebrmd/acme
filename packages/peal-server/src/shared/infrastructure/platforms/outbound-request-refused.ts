import { Schema } from "effect";

/**
 * A request Acme will not send, because a user chose where it goes:
 *
 * - `notHttps`: the URL is not HTTPS on the default port.
 * - `notPublic`: the host is, or resolves to, an address that is not public
 *   (loopback, private, link-local, reserved and the like).
 * - `unknownHost`: the host name does not resolve.
 * - `lookupFailed`: resolving the host failed for now; trying again may work.
 */
export class OutboundRequestRefused extends Schema.TaggedError<OutboundRequestRefused>()(
  "OutboundRequestRefused",
  {
    host: Schema.String,
    reason: Schema.Literals([
      "notHttps",
      "notPublic",
      "unknownHost",
      "lookupFailed",
    ]),
  }
) {
  override get message(): string {
    return `Acme does not send requests to ${this.host} (${this.reason})`;
  }
}
