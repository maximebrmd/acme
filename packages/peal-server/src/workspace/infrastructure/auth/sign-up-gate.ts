import type { GenericEndpointContext } from "better-auth";
import { APIError } from "better-auth/api";
import { Option, Schema } from "effect";
import { signUpInvitationHeader } from "peal-contract";

/**
 * Whether an address may make an account, as the server's sign-up mode
 * decides: awaited before Better Auth's sign-up. A failure refuses the
 * request.
 */
export type SignUpAdmission = (
  email: string,
  invitationId: string | undefined
) => Promise<boolean>;

const decodeEmail = Schema.decodeUnknownOption(
  Schema.Struct({ email: Schema.String })
);

/** The code a sign-up the server's mode refuses answers with. */
export const signUpByInvitationCode = "SIGN_UP_BY_INVITATION";

/**
 * Refuses a sign-up the server does not admit, with 403
 * `SIGN_UP_BY_INVITATION`: the same answer for every refusal, whatever the
 * address, its account or its invitation. The invitation is named in the
 * `x-peal-invitation` header. An admitted address goes on to
 * Better Auth's sign-up, which answers one that has an account with a
 * made-up user, as on an open server. A body without an address is left
 * to the route, which refuses it.
 */
export const refuseUnadmittedSignUps = async (
  ctx: GenericEndpointContext,
  admits: SignUpAdmission
) => {
  if (ctx.path !== "/sign-up/email") {
    return;
  }

  const body = decodeEmail(ctx.body);

  if (Option.isNone(body)) {
    return;
  }

  const invitationId = ctx.headers?.get(signUpInvitationHeader) ?? undefined;

  if (await admits(body.value.email, invitationId)) {
    return;
  }

  throw APIError.from("FORBIDDEN", {
    code: signUpByInvitationCode,
    message:
      "Accounts on this server are made by invitation: open the link of the invitation, and sign up with the address it went to",
  });
};
