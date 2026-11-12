import { Schema } from "effect";
import type { SignUpMode } from "peal-contract";

// An invitation's id is a UUID, as the server checks it: anything else (a link
// a mail client mangled) shows no form and goes in no header.
const isInvitationId = Schema.is(Schema.String.check(Schema.isUUID()));

// What the auth pages show of signing up, by the server's mode
// (`PEAL_SIGN_UP`, which `GET /api/captcha` tells). The server decides who
// may sign up: these only spare a visitor a form it would refuse.

/**
 * Whether the sign-up page shows its form: always on an open server; on
 * one by invitation, to a visitor an invitation's page sent
 * (`?invitation=<id>`). The address is typed by the person, and checked by
 * the server.
 */
export const signUpFormShown = (
  mode: SignUpMode,
  invitation: string | readonly string[] | undefined
): boolean => mode === "open" || isInvitationId(invitation);

/** The invitation a visitor came from, which their sign-up sends. */
export const invitationOf = (
  invitation: string | readonly string[] | undefined
): string | null => (isInvitationId(invitation) ? invitation : null);

/** Whether the sign-in page links to the sign-up page. */
export const offersSignUp = (mode: SignUpMode): boolean => mode === "open";
