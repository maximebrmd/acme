import { Effect } from "effect";

import { AuthUnavailable } from "#workspace/application/auth-unavailable.ts";

/** A call to Better Auth, which fails as AuthUnavailable when it throws. */
export const attempt = <A>(call: () => Promise<A>) =>
  Effect.tryPromise({
    catch: (cause) => new AuthUnavailable({ cause }),
    try: call,
  });
