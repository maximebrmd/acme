import { Option } from "effect";

import { tokenPolicies } from "#channels/domain/token-policy.ts";

import { avatarOf, facebookLogin } from "./facebook-login.ts";
import type { FacebookLoginProduct } from "./facebook-login.ts";

// Listing the user's Pages, and posting text, photos and videos on them.
const facebookScopes = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
] as const;

/**
 * Facebook Pages through Facebook Login: each Page the user may create
 * content on is an account to choose, posting with its own token.
 */
export const facebookPages: FacebookLoginProduct = {
  accountsOf: (page) =>
    // Meta lists the tasks the user may perform on the Page; posting needs
    // CREATE_CONTENT. A Page listed without tasks is taken as it comes.
    page.tasks === undefined || page.tasks.includes("CREATE_CONTENT")
      ? [
          {
            accountId: page.id,
            avatarUrl: avatarOf(page.picture?.data.url),
            displayName: Option.some(page.name),
            handle:
              page.username === undefined || page.username.trim() === ""
                ? page.name
                : `@${page.username}`,
          },
        ]
      : [],
  platform: "facebook",
  policy: tokenPolicies.facebook,
  scopes: facebookScopes,
};

/** The Facebook Pages authorizer, for Meta's main app. */
export const facebookAuthorizer = (
  options: Parameters<typeof facebookLogin>[1]
) => facebookLogin(facebookPages, options);
