import { Cause, Exit, Option, Schema } from "effect";

import type { AuthClientError } from "#auth/errors.ts";

// Why a settings action failed, as the catalogues explain it, from Better
// Auth's error codes and the API's errors. Messages live under
// WorkspaceSettings.errors and AccountSettings.errors.

const reasons = new Map<string, SettingsErrorKey>([
  ["IMPERSONATION_READ_ONLY", "impersonating"],
  ["INVALID_PASSWORD", "incorrectPassword"],
  ["PASSWORD_TOO_LONG", "passwordTooLong"],
  ["PASSWORD_TOO_SHORT", "passwordTooShort"],
  ["USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION", "alreadyMember"],
  ["USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION", "alreadyInvited"],
  ["YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION", "forbidden"],
  ["YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER", "forbidden"],
  ["YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE", "forbidden"],
  ["YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION", "forbidden"],
  ["YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER", "forbidden"],
  ["YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION", "forbidden"],
  ["YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER", "lastOwner"],
  ["YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER", "lastOwner"],
]);

export const SettingsErrorKeySchema = Schema.Literals([
  "alreadyInvited",
  "alreadyMember",
  "busy",
  "forbidden",
  "impersonating",
  "incorrectPassword",
  "lastOwner",
  "nameMismatch",
  "notFound",
  "passwordTooLong",
  "passwordTooShort",
  "tooManyRequests",
  "unknown",
]);

export type SettingsErrorKey = typeof SettingsErrorKeySchema.Type;

/** The catalogue key that explains a failed Better Auth call. */
export const settingsErrorKey = (error: AuthClientError): SettingsErrorKey => {
  if (error.status === 429) {
    return "tooManyRequests";
  }

  return Option.fromUndefinedOr(error.code).pipe(
    Option.flatMap((code) => Option.fromUndefinedOr(reasons.get(code))),
    Option.getOrElse((): SettingsErrorKey => "unknown")
  );
};

// The API's errors, by tag.
const apiReasons = new Map<string, SettingsErrorKey>([
  ["ConnectedAppNotFound", "notFound"],
  ["Forbidden", "forbidden"],
  ["IncorrectPassword", "incorrectPassword"],
  ["LastOwner", "lastOwner"],
  ["WorkspaceBusy", "busy"],
  ["WorkspaceNameMismatch", "nameMismatch"],
]);

/**
 * The catalogue key that explains how an API call ended, or none if it
 * worked. Anything but the API's own errors, such as the server being down,
 * is unknown.
 */
export const apiErrorKey = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): Option.Option<SettingsErrorKey> =>
  Exit.isSuccess(exit)
    ? Option.none()
    : Option.some(
        Cause.findErrorOption(exit.cause).pipe(
          Option.flatMap(({ _tag }) =>
            Option.fromUndefinedOr(apiReasons.get(_tag))
          ),
          Option.getOrElse((): SettingsErrorKey => "unknown")
        )
      );
