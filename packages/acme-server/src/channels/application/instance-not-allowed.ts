import { Schema } from "effect";

/**
 * Acme refuses to call the server: it is not served over HTTPS, or its name
 * leads to a private, loopback or otherwise non-public address, which would
 * let a request reach inside Acme's own network.
 */
export class InstanceNotAllowed extends Schema.TaggedError<InstanceNotAllowed>()(
  "InstanceNotAllowed",
  { host: Schema.String }
) {
  override get message(): string {
    return `Acme does not call ${this.host}: it is not a public HTTPS server`;
  }
}
