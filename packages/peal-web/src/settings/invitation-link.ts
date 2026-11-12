import { routing } from "#i18n/routing.ts";

/**
 * The address of an invitation's page, on `origin`, in `locale`: the link
 * Better Auth's email holds, which only the invited address may accept.
 * The default language has no prefix, as the router writes it.
 */
export const invitationLink = (
  origin: string,
  locale: string,
  invitationId: string
): string =>
  `${origin}${locale === routing.defaultLocale ? "" : `/${locale}`}/invitations/${invitationId}`;
