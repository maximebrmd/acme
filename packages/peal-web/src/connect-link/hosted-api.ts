import { Cause, Exit, Option, Schema } from "effect";
import { Atom } from "effect/reactivity";
import {
  connectLinkTokenHeader,
  HostedConnectFailureSchema,
} from "peal-contract";
import type { HostedConnectFailure } from "peal-contract";

import { PealApi } from "#api/client.ts";

/** What a connect link's page shows, read with the link's token alone. */
/**
 * The link's token as every hosted call carries it: in a header, never in
 * an address.
 */
export const tokenHeaders = (token: string) => ({
  [connectLinkTokenHeader]: token,
});

export const hostedLinkOf = Atom.family((token: string) =>
  PealApi.query("hostedConnect", "open", { headers: tokenHeaders(token) })
);

export const startHostedLink = PealApi.mutation("hostedConnect", "start");

export const completeHostedLink = PealApi.mutation("hostedConnect", "complete");

export const chooseHostedAccounts = PealApi.mutation("hostedConnect", "choose");

/**
 * Why a hosted step failed, as the page words it: a reason the server
 * gave, `notFound` for a link that opens nothing, `tooMany` for an address
 * that tried too often, or `unknown`.
 */
export type HostedErrorKey =
  | HostedConnectFailure
  | "notFound"
  | "tooMany"
  | "unknown";

/** A failed step: why, and where the page may send the browser back. */
export interface HostedFailure {
  readonly error: HostedErrorKey;
  readonly returnTo: string | null;
}

// Other errors carry a `reason` of their own (a refusal's), which is not a
// hosted step's.
interface Tagged {
  readonly _tag: string;
  readonly reason?: string;
  readonly returnTo?: string | null;
}

const isHostedReason = Schema.is(HostedConnectFailureSchema);

const failed = (error: HostedErrorKey): HostedFailure => ({
  error,
  returnTo: null,
});

// The contract's errors, told apart by tag; anything else, such as the
// server being down, is unknown.
const failureFrom = (error: Tagged): HostedFailure => {
  switch (error._tag) {
    case "HostedConnectFailed": {
      return {
        error: isHostedReason(error.reason) ? error.reason : "unknown",
        returnTo: error.returnTo ?? null,
      };
    }

    case "ConnectLinkNotFound": {
      return failed("notFound");
    }

    case "TooManyConnectAttempts": {
      return failed("tooMany");
    }

    default: {
      return failed("unknown");
    }
  }
};

/** What a hosted step ended with, or none if it worked. */
export const hostedFailureOf = <A, E extends Tagged>(
  exit: Exit.Exit<A, E>
): Option.Option<HostedFailure> =>
  Exit.isFailure(exit)
    ? Option.some(
        Cause.findErrorOption(exit.cause).pipe(
          Option.match({
            onNone: () => failed("unknown"),
            onSome: failureFrom,
          })
        )
      )
    : Option.none();

/**
 * Whether a link that failed this way can be tried again from its page:
 * not once it is over, nor when it opens nothing.
 */
export const canRetry = (error: HostedErrorKey): boolean =>
  ![
    "linkCompleted",
    "linkExpired",
    "linkRevoked",
    "notFound",
    "tooManyAttempts",
  ].includes(error);
