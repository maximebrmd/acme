import { Context, Effect, Layer } from "effect";

import { CurrentInboxPlatforms } from "#shared/application/current-inbox-platforms.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { ChannelRepository } from "./channel-repository.ts";

/**
 * The daily run that forgets the members LinkedIn pages' tokens are theirs
 * (`channels.token_owner`) on a server whose inbox no longer reads
 * LinkedIn, the one use of them: a token that never renews keeps the one
 * kept until it is reconnected otherwise. It forgets nothing where the
 * inbox reads LinkedIn. Says how many it forgot.
 */
export class ForgetTokenOwners extends Context.Service<
  ForgetTokenOwners,
  { readonly run: Effect.Effect<number, DatabaseError> }
>()("peal-server/channels/application/ForgetTokenOwners") {
  static readonly layer = Layer.effect(
    ForgetTokenOwners,
    Effect.gen(function* ForgetTokenOwnersLive() {
      const channels = yield* ChannelRepository;
      const inbox = yield* CurrentInboxPlatforms;

      return ForgetTokenOwners.of({
        run: inbox.has("linkedin")
          ? Effect.succeed(0)
          : channels.forgetTokenOwners.pipe(
              Effect.withSpan("ForgetTokenOwners.run")
            ),
      });
    })
  );
}
