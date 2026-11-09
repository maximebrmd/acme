import { Effect, Layer, Schema } from "effect";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import type { AccessFailure } from "#channels/application/channel-access.ts";
import { ChannelUnusable } from "#channels/application/channel-unusable.ts";
import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import type {
  CredentialFailure,
  PublishingToken,
} from "#publishing/application/platform-credentials.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";

const isUnusable = Schema.is(ChannelUnusable);

const isDatabaseError = Schema.is(DatabaseError);

// Disconnected or turned off: the post cannot go out on the channel.
const unusable = ({ reason }: ChannelUnusable) =>
  Effect.fail(
    new BadRequest({
      code:
        reason === "notFound"
          ? ownRefusalCodes.channelDisconnected
          : ownRefusalCodes.channelDisabled,
    })
  );

// The channels context could not read or save the token: nothing was sent,
// and trying again later is safe.
const databaseDown = (failure: DatabaseError) =>
  Effect.logWarning("Could not read a channel's token", failure).pipe(
    Effect.andThen(Effect.fail(new PlatformUnavailable()))
  );

// What the channels context's refusal means for publishing; failures of
// the call itself pass through.
const credentialFailure = <E>(
  failure: AccessFailure | E
): Effect.Effect<never, CredentialFailure | E> => {
  if (isUnusable(failure)) {
    return unusable(failure);
  }

  return isDatabaseError(failure)
    ? databaseDown(failure)
    : Effect.fail(failure);
};

/** The channel's credentials, as the channels context hands them out. */
export const ChannelAccessCredentials = Layer.effect(
  PlatformCredentials,
  Effect.gen(function* ChannelAccessCredentials() {
    const access = yield* ChannelAccess;

    return PlatformCredentials.of({
      account: (channelId) =>
        access.account(channelId).pipe(
          Effect.map(({ accountId, platform }) => ({ accountId, platform })),
          Effect.catchTags({
            ChannelUnusable: unusable,
            DatabaseError: databaseDown,
          })
        ),
      withToken: <A, E, R>(
        channelId: ChannelId,
        use: (token: PublishingToken) => Effect.Effect<A, E | TokenRejected, R>
      ): Effect.Effect<A, CredentialFailure | Exclude<E, TokenRejected>, R> =>
        access
          .withToken(channelId, ({ accessToken, accountId, platform }) =>
            use({ accessToken, accountId, platform })
          )
          .pipe(Effect.catch(credentialFailure<Exclude<E, TokenRejected>>)),
    });
  })
);
