import { Context } from "effect";

/**
 * Where a review link is opened: the web app's page, with the link's token
 * after the `#`, which browsers keep to themselves, so the token reaches no
 * server's address logs.
 */
export class LinkAddresses extends Context.Service<
  LinkAddresses,
  { readonly of: (token: string) => string }
>()("peal-server/review/application/LinkAddresses") {}
