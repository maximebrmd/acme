import { Option } from "effect";

/** Where a deployment answers, and where its documentation is. */
export interface Places {
  /** The documentation's origin, when the operator gave it. */
  readonly docs: Option.Option<string>;
  /** PUBLIC_URL: the one origin people and programs reach Peal at. */
  readonly origin: string;
}

/** The media type of an API catalogue (RFC 9727, section 4.2). */
export const catalogueType =
  'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"';

/** The well-known path of the API catalogue (RFC 9727, section 2). */
export const cataloguePath = "/.well-known/api-catalog";

/** Where the OpenAPI document is published. */
export const openApiPath = "/api/openapi.json";

/** The media type of an MCP server card (SEP-2127). */
export const serverCardType = "application/mcp-server-card+json";

const docLink = (docs: Option.Option<string>, page: string) =>
  Option.match(docs, {
    onNone: () => ({}),
    onSome: (base) => ({
      "service-doc": [{ href: `${base}/${page}`, type: "text/html" }],
    }),
  });

/**
 * The API catalogue (RFC 9727): a Linkset (RFC 9264) with one entry for
 * the HTTP API and one for the MCP endpoint, each with its description for
 * programs (`service-desc`), its documentation when the server knows where
 * it is (`service-doc`), and how to get a credential for it
 * (`service-meta`: its OAuth protected resource metadata, RFC 9728).
 */
export const apiCatalogue = ({ docs, origin }: Places) => ({
  linkset: [
    {
      anchor: `${origin}/api`,
      "service-desc": [
        { href: `${origin}${openApiPath}`, type: "application/openapi+json" },
      ],
      ...docLink(docs, "developers"),
      "service-meta": [
        {
          href: `${origin}/.well-known/oauth-protected-resource/api`,
          type: "application/json",
        },
      ],
      status: [{ href: `${origin}/api/health` }],
    },
    {
      anchor: `${origin}/api/mcp`,
      "service-desc": [
        { href: `${origin}/api/mcp/server-card`, type: serverCardType },
      ],
      ...docLink(docs, "developers/mcp"),
      "service-meta": [
        {
          href: `${origin}/.well-known/oauth-protected-resource/api/mcp`,
          type: "application/json",
        },
      ],
    },
  ],
});

/**
 * The MCP endpoint's server card (SEP-2127, an extension of the Model
 * Context Protocol): what a client needs to connect before it has
 * connected. It names the endpoint, the protocol revisions it speaks and
 * the header that carries the credential, never a credential; tools are
 * listed by the endpoint itself.
 */
export const serverCard = (
  { origin }: Places,
  server: {
    readonly protocolVersions: readonly string[];
    readonly version: string;
  }
) => ({
  $schema:
    "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
  description:
    "Schedule and publish social media posts for a team, and read how they went.",
  name: "social.peal/peal",
  remotes: [
    {
      headers: [
        {
          description:
            "An OAuth access token for this endpoint, which the client gets by signing its user in (the endpoint's 401 says where), or an API key of a workspace, for an agent that runs with nobody to sign in.",
          isRequired: true,
          isSecret: true,
          name: "Authorization",
          value: "Bearer {token}",
          variables: {
            token: {
              description: "The access token or the API key.",
              isRequired: true,
              isSecret: true,
            },
          },
        },
      ],
      supportedProtocolVersions: server.protocolVersions,
      type: "streamable-http",
      url: `${origin}/api/mcp`,
    },
  ],
  repository: {
    source: "github",
    subfolder: "packages/peal-server",
    url: "https://github.com/peal-social/peal",
  },
  title: "Peal",
  version: server.version,
  websiteUrl: origin,
});

const section = (title: string, links: readonly (readonly string[])[]) =>
  links.length === 0
    ? []
    : [
        `## ${title}`,
        "",
        ...links.map(([name, url, note]) => `- [${name}](${url}): ${note}`),
        "",
      ];

/**
 * llms.txt (llmstxt.org): what Peal is and where a program finds its API,
 * its MCP endpoint and their documentation, as Markdown a language model
 * reads: a title, a summary, then sections of links.
 */
export const llmsText = ({ docs, origin }: Places): string =>
  [
    "# Peal",
    "",
    "> Peal schedules social media posts for teams: a post is written once, scheduled across platforms, and its results read in one place. This server answers an HTTP API, an MCP endpoint for AI agents and Peal's command line.",
    "",
    "A program acts in a workspace with an API key (`Authorization: Bearer peal_…`) or an OAuth access token, and may do what the key's permissions or the token's scopes allow. What is scheduled or published goes out in public on the platforms and cannot be taken back from Peal: publishing takes the scope `workspace:publish` or the permission `post:schedule`, and a draft is the safe default. Every error carries a stable `code`, a `message` and the `requestId` to quote when asking for help.",
    "",
    ...section("API", [
      [
        "OpenAPI document",
        `${origin}${openApiPath}`,
        "every endpoint, its parameters, answers and errors (OpenAPI 3.1)",
      ],
      [
        "API catalogue",
        `${origin}${cataloguePath}`,
        "the API and the MCP endpoint with their descriptions, as a Linkset (RFC 9727)",
      ],
      [
        "Health",
        `${origin}/api/health`,
        "answers 204 while the server is up, without credentials",
      ],
      [
        "Credentials for the API",
        `${origin}/.well-known/oauth-protected-resource/api`,
        "the authorization server and scopes (RFC 9728)",
      ],
    ]),
    ...section("Agents", [
      [
        "MCP endpoint",
        `${origin}/api/mcp`,
        "Streamable HTTP; an OAuth access token or an API key as the bearer token; call the tool find_tools to list the tools by area",
      ],
      [
        "MCP server card",
        `${origin}/api/mcp/server-card`,
        "the endpoint, the protocol revisions it speaks and how to authenticate",
      ],
      [
        "Credentials for the MCP endpoint",
        `${origin}/.well-known/oauth-protected-resource/api/mcp`,
        "the authorization server and scopes (RFC 9728)",
      ],
    ]),
    ...Option.match(docs, {
      onNone: () => [],
      onSome: (base) =>
        section("Documentation", [
          [
            "API conventions",
            `${base}/developers/conventions`,
            "errors and their codes, ids, paging, idempotency, rate limits, versioning",
          ],
          [
            "Posting from an AI agent",
            `${base}/developers/agents`,
            "what an agent may do, how to let it publish or only draft, and how to read what it did",
          ],
          [
            "MCP",
            `${base}/developers/mcp`,
            "connecting a client, the tools and what each changes",
          ],
          [
            "Command line",
            `${base}/developers/cli`,
            "the peal command, its sign-in and JSON output",
          ],
          [
            "Webhooks",
            `${base}/developers/webhooks`,
            "events, signatures and retries",
          ],
          [
            "Full documentation for language models",
            `${base}/llms.txt`,
            "the documentation's own llms.txt, with every page as Markdown",
          ],
        ]),
    }),
  ].join("\n");
