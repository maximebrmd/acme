import { Schema } from "effect";

import { EncryptedTokenSchema } from "./token-cipher.ts";

/**
 * A channel's tokens as stored, each encrypted by the TokenCipher for the
 * channel. Both are encrypted with the same key. The refresh token is there
 * when the platform gave one; `grantedBy` names the platform user the
 * tokens rest on when that is not the account itself (a Page's manager), in
 * the clear, so a request to delete that user's data finds the channel.
 */
export class ChannelCredentials extends Schema.Class<ChannelCredentials>(
  "acme-server/channels/application/ChannelCredentials"
)({
  accessToken: EncryptedTokenSchema,
  grantedBy: Schema.optionalKey(Schema.NonEmptyString),
  refreshToken: Schema.Option(EncryptedTokenSchema),
}) {}
