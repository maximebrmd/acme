import { Option } from "effect";

import type { Principal } from "./principal.ts";

/**
 * What a principal's requests are counted under for the rate limit, if
 * they are counted: an API key by its id, a partner key by its own,
 * whichever of its partner's workspaces it acts in (one credential, one
 * count), and an OAuth application by itself and the user it acts for,
 * whichever of their tokens it sends. A person in their
 * own session, in the web app, is not counted here: Better Auth limits its
 * own routes, and the web app is Peal's own client.
 */
export const limitSubjectOf = (
  principal: Principal
): Option.Option<string> => {
  if (principal._tag === "ApiKeyPrincipal") {
    return Option.some(`key:${principal.apiKeyId}`);
  }

  if (principal._tag === "PartnerKeyPrincipal") {
    return Option.some(`partner-key:${principal.partnerKeyId}`);
  }

  return principal.oauth.pipe(
    Option.map(({ clientId }) => `oauth:${clientId}:${principal.userId}`)
  );
};
