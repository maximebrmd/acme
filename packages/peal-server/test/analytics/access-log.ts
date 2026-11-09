import { Context, Effect, Layer, Option, Redacted, Ref } from "effect";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import type {
  AccessFailure,
  ChannelAccount,
  ChannelToken,
} from "#channels/application/channel-access.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { isTokenRejected } from "#shared/domain/token-rejected.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";

/** Why ChannelAccess says nothing of an account. */
export type AccountFailure = Effect.Error<
  ReturnType<ChannelAccess["Service"]["account"]>
>;

/** How the ChannelAccess stand-in went. */
export class AccessLog extends Context.Service<
  AccessLog,
  {
    /** The tokens handed to calls, in order. */
    readonly handed: Effect.Effect<readonly string[]>;
  }
>()("test/analytics/AccessLog") {}

/**
 * ChannelAccess as the channels context behaves, for one account: the
 * first of `tokens` until a call refuses it, then the next, once; a
 * renewed token refused again, or none left, is TokenExpired. A failure in
 * place of the account is what every call answers.
 */
export const channelAccessOf = (
  account: AccountFailure | ChannelAccount,
  tokens: readonly string[] = []
) =>
  Layer.effectContext(
    Effect.gen(function* building() {
      const current = yield* Ref.make(0);
      const handed = yield* Ref.make<readonly string[]>([]);

      const found: Effect.Effect<ChannelAccount, AccountFailure> =
        "_tag" in account ? Effect.fail(account) : Effect.succeed(account);

      const tokenAt = (index: number) =>
        found.pipe(
          Effect.flatMap((owner) =>
            Option.fromUndefinedOr(tokens[index]).pipe(
              Option.match({
                onNone: () => Effect.fail(new TokenExpired()),
                onSome: (token) =>
                  Ref.update(handed, (before) => [...before, token]).pipe(
                    Effect.as<ChannelToken>({
                      ...owner,
                      accessToken: Redacted.make(token),
                    })
                  ),
              })
            )
          )
        );

      const withToken = <A, E, R>(
        _channel: ChannelId,
        use: (token: ChannelToken) => Effect.Effect<A, E | TokenRejected, R>
      ): Effect.Effect<A, AccessFailure | Exclude<E, TokenRejected>, R> =>
        Ref.get(current).pipe(
          Effect.flatMap(tokenAt),
          Effect.flatMap((token) =>
            use(token).pipe(
              Effect.catchIf(isTokenRejected, () =>
                Ref.updateAndGet(current, (index) => index + 1).pipe(
                  Effect.flatMap(tokenAt),
                  Effect.flatMap((renewed) =>
                    use(renewed).pipe(
                      Effect.catchIf(isTokenRejected, () =>
                        Effect.fail(new TokenExpired())
                      )
                    )
                  )
                )
              )
            )
          )
        );

      return Context.make(
        ChannelAccess,
        ChannelAccess.of({ account: () => found, withToken })
      ).pipe(Context.add(AccessLog, AccessLog.of({ handed: Ref.get(handed) })));
    })
  );
