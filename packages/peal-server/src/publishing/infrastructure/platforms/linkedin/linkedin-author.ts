import { isOrganization } from "#shared/infrastructure/platforms/linkedin-rest.ts";

/**
 * The URN a channel's posts and uploads are by: a page's own, which the
 * channels context keeps as the account's id, or the person URN a member's
 * OpenID Connect subject takes.
 */
export const authorUrnOf = (accountId: string): string =>
  isOrganization(accountId) ? accountId : `urn:li:person:${accountId}`;
