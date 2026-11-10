// Deliveries are signed as the Standard Webhooks specification says
// (https://www.standardwebhooks.com): HMAC-SHA256, keyed with the bytes the
// secret encodes in base64 after `whsec_`, over `<id>.<timestamp>.<body>`.

/** What every secret starts with, so they are told from other keys. */
export const secretPrefix = "whsec_";

/** How many random bytes a secret holds: the specification asks 24 to 64. */
export const secretBytes = 32;

/** One delivery attempt of an event, as it is signed. */
export interface SignedMessage {
  /** The request body, exactly as sent. */
  readonly body: string;
  /** The event's id, the same on every attempt. */
  readonly id: string;
  /** When this attempt is made, in seconds since the epoch. */
  readonly timestamp: number;
}

/** The text the signature covers. */
export const signedContent = ({ body, id, timestamp }: SignedMessage): string =>
  `${id}.${timestamp}.${body}`;

/**
 * The headers of an attempt, with one signature per secret still valid
 * (`macs`: each HMAC in base64), which a receiver checks against any.
 */
export const signedHeaders = (
  message: SignedMessage,
  macs: readonly string[]
) => ({
  "webhook-id": message.id,
  "webhook-signature": macs.map((mac) => `v1,${mac}`).join(" "),
  "webhook-timestamp": message.timestamp.toString(),
});
