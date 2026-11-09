import { Context } from "effect";

/** Where people read a data deletion request's status, on the web app. */
export class DataDeletionLinks extends Context.Service<
  DataDeletionLinks,
  { readonly statusUrl: (code: string) => string }
>()("peal-server/channels/application/DataDeletionLinks") {}
