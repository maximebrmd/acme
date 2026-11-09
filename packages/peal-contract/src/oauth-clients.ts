import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

/** What anyone signed in may know of an OAuth client (RFC 7591 names). */
export const PublicClientSchema = Schema.Struct({
  client_id: Schema.String,
  client_name: Schema.optional(Schema.String),
  client_uri: Schema.optional(Schema.String),
  logo_uri: Schema.optional(Schema.String),
}).annotate({ identifier: "PublicClient" });

export type PublicClient = typeof PublicClientSchema.Type;

/** The OAuth clients, as the pages of an authorization show them. */
export class OAuthClientsApi extends HttpApiGroup.make("clients").add(
  HttpApiEndpoint.get("publicClient", "/api/auth/oauth2/public-client", {
    query: { client_id: Schema.String },
    success: PublicClientSchema,
  }).annotateMerge(
    OpenApi.annotations({
      description:
        "Answers with the public fields of an OAuth client. Needs the session cookie.",
      summary: "Describe an OAuth client",
    })
  )
) {}
