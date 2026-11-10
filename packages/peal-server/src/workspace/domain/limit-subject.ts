import { Option } from "effect";

import type { Principal } from "./principal.ts";

/**
 * What a principal's requests are counted under for the rate limit, if
 * they are counted: an API key by its id, whatever it belongs to (so a key
 * that one day spans several workspaces, as a partner's would, is still one
 * credential with one count), and an OAuth application by itself and the
 * user it acts for, whichever of their tokens it sends. A person in their
 * own session, in the web app, is not counted here: Better Auth limits its
 * own routes, and the web app is Peal's own client.
 */
export const limitSubjectOf = (principal: Principal): Option.Option<string> =>
  principal._tag === "ApiKeyPrincipal"
    ? Option.some(`key:${principal.apiKeyId}`)
    : principal.oauth.pipe(
        Option.map(({ clientId }) => `oauth:${clientId}:${principal.userId}`)
      );
