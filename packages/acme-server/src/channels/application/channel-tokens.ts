import { Effect, Option } from "effect";

import type { ChannelId } from "#shared/domain/ids.ts";

import { ChannelCredentials } from "./channel-credentials.ts";
import type { IssuedTokens, StoredTokens } from "./platform-authorizer.ts";
import { TokenCipher } from "./token-cipher.ts";

/** The tokens a platform issued, encrypted for the channel, as stored. */
export const encryptTokens = Effect.fn("ChannelTokens.encrypt")(
  function* encryptTokens(tokens: IssuedTokens, channelId: ChannelId) {
    const cipher = yield* TokenCipher;

    const accessToken = yield* cipher.encrypt(tokens.accessToken, channelId);

    const refreshToken = Option.isSome(tokens.refreshToken)
      ? Option.some(yield* cipher.encrypt(tokens.refreshToken.value, channelId))
      : Option.none();

    return new ChannelCredentials({ accessToken, refreshToken });
  }
);

/** A channel's stored tokens, decrypted for the platform call that needs them. */
export const decryptTokens = Effect.fn("ChannelTokens.decrypt")(
  function* decryptTokens(
    credentials: ChannelCredentials,
    channelId: ChannelId
  ) {
    const cipher = yield* TokenCipher;

    const accessToken = yield* cipher.decrypt(
      credentials.accessToken,
      channelId
    );

    const refreshToken = Option.isSome(credentials.refreshToken)
      ? Option.some(
          yield* cipher.decrypt(credentials.refreshToken.value, channelId)
        )
      : Option.none();

    const tokens: StoredTokens = { accessToken, refreshToken };

    return tokens;
  }
);
