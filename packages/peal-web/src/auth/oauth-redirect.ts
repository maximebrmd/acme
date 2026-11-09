import { Schema } from "effect";

/**
 * Better Auth's answer during an OAuth authorization: the page to go to
 * next (the workspace picker, the consent page, or the client's redirect
 * URI). Its client follows it by itself.
 */
export const OAuthRedirectSchema = Schema.Struct({
  redirect: Schema.Literal(true),
  url: Schema.String,
});

export const isOAuthRedirect = Schema.is(OAuthRedirectSchema);
