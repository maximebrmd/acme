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

/** The catalogue key that explains a failed call. */
export const authErrorKey = (error: AuthClientError): AuthErrorKey =>
  error.status === 429
    ? "TOO_MANY_REQUESTS"
    : decodeKnownError(error.code).pipe(
        Option.getOrElse((): AuthErrorKey => "UNKNOWN")
      );
