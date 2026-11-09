import { Option } from "effect";

import { tokenPolicies } from "#channels/domain/token-policy.ts";

import { avatarOf, facebookLogin } from "./facebook-login.ts";
import type { FacebookLoginProduct } from "./facebook-login.ts";

// Listing the user's Pages and their Instagram accounts, and publishing on
// those accounts (Instagram's "Content Publishing" page).
const instagramScopes = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
] as const;

/**
 * Instagram professional accounts through Facebook Login: each linked to
 * one of the user's Pages is an account to choose, publishing with the
 * Page's token, as Meta's Instagram API with Facebook Login does.
 */
export const instagramAccounts: FacebookLoginProduct = {
  accountsOf: (page) => {
    const linked = page.instagram_business_account;

    return linked === undefined
      ? []
      : [
          {
            accountId: linked.id,
            avatarUrl: avatarOf(linked.profile_picture_url),
            displayName: Option.fromUndefinedOr(linked.name).pipe(
              Option.filter((name) => name.trim() !== "")
            ),
            handle: `@${linked.username}`,
          },
        ];
  },
  platform: "instagram",
  policy: tokenPolicies.instagram,
  scopes: instagramScopes,
};

/** The Instagram authorizer, for Meta's main app. */
export const instagramAuthorizer = (
  options: Parameters<typeof facebookLogin>[1]
) => facebookLogin(instagramAccounts, options);
