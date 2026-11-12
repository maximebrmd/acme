import { Effect } from "effect";
import { CurrentPrincipal, Forbidden } from "peal-contract";
import type { PartnerScope, Principal } from "peal-contract";

// What the partner API's endpoints answer about the key they take, in the
// same words whichever context serves the endpoint: the workspace
// context's `/api/partner` and billing's `/api/partner/usage`.

/** A partner key, as the contract describes the principal behind it. */
export type PartnerKeyCredential = Extract<
  Principal,
  { readonly _tag: "partnerKey" }
>;

/**
 * The partner key a request to the partner API carries. Anything else, a
 * workspace's API key and a member's session included, may not call it.
 */
export const partnerKeyOnly: Effect.Effect<
  PartnerKeyCredential,
  Forbidden,
  CurrentPrincipal
> = Effect.gen(function* partnerKeyOnly() {
  const principal = yield* CurrentPrincipal;

  return principal._tag === "partnerKey"
    ? principal
    : yield* new Forbidden({
        message:
          "The partner API takes a partner key, sent as a bearer token: not a session, a workspace's API key or an application's token.",
      });
});

/** A key without the scope a request takes is told which, and who gives it. */
export const withoutPartnerScope = ({
  scope,
}: {
  readonly scope: PartnerScope;
}): Effect.Effect<never, Forbidden> =>
  Effect.fail(
    new Forbidden({
      message: `This partner key was not given the scope ${scope}, which this request takes. An owner or an admin of the partner's workspace creates a key that has it.`,
      reason: "missingScope",
      scope,
    })
  );

/** The key works, and its partner account is gone: closed meanwhile. */
export const partnerClosed = (): Effect.Effect<never, Forbidden> =>
  Effect.fail(
    new Forbidden({
      message:
        "The partner account this key belongs to was closed: its keys do nothing more.",
    })
  );
