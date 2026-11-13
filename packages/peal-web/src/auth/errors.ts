import { Option, Schema } from "effect";

// The Better Auth error codes the forms explain. Anything else reads as a
// generic failure. Messages live in the catalogues under Auth.errors.
const KnownErrorSchema = Schema.Literals([
  "BANNED_USER",
  "EMAIL_NOT_VERIFIED",
  "INVALID_EMAIL",
  "INVALID_EMAIL_OR_PASSWORD",
  "INVALID_TOKEN",
  "PASSWORD_TOO_LONG",
  "PASSWORD_TOO_SHORT",
  "USER_ALREADY_EXISTS",
  // The workspace's plan has no room for another member.
  "MEMBER_LIMIT_REACHED",
  // The owner who pays for the workspace leaves it, is removed or stops
  // being an owner before handing it over.
  "PAYER_MUST_STAY",
  // The account already owns its one free workspace.
  "FREE_WORKSPACE_LIMIT_REACHED",
  // The captcha's token was missing, or Turnstile refused it.
  "MISSING_RESPONSE",
  "VERIFICATION_FAILED",
  // Two-step verification: a wrong code or recovery code, too many
  // attempts at one sign-in, the account locked for a while, a second
  // step that expired, and turning it on twice.
  "INVALID_CODE",
  "INVALID_BACKUP_CODE",
  "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE",
  "ACCOUNT_TEMPORARILY_LOCKED",
  "INVALID_TWO_FACTOR_COOKIE",
  "TOTP_ALREADY_ENABLED",
  "INVALID_PASSWORD",
  // Peal's own: an address to confirm first, a workspace that keeps it
  // on, and a workspace that refuses a member without it.
  "EMAIL_NOT_VERIFIED_FOR_TWO_STEP",
  "TWO_STEP_REQUIRED_BY_WORKSPACE",
  "TWO_STEP_REQUIRED",
  // A server where accounts are made by invitation refused the address.
  "SIGN_UP_BY_INVITATION",
]);

export type AuthErrorKey =
  | typeof KnownErrorSchema.Type
  | "TOO_MANY_REQUESTS"
  | "UNKNOWN";

const decodeKnownError = Schema.decodeUnknownOption(KnownErrorSchema);

/** What a Better Auth client call failed with, as its client reports it. */
export interface AuthClientError {
  readonly code?: string | undefined;
  readonly status: number;
}

/**
 * The catalogue key that explains a failed call: what its code says, the
 * rate limit for an unknown one that answered 429 (an account locked by
 * two-step verification answers 429 with its own code).
 */
export const authErrorKey = (error: AuthClientError): AuthErrorKey =>
  decodeKnownError(error.code).pipe(
    Option.getOrElse((): AuthErrorKey =>
      error.status === 429 ? "TOO_MANY_REQUESTS" : "UNKNOWN"
    )
  );
