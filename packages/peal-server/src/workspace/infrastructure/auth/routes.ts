import { Effect, Layer, Option, Schema } from "effect";
import { HttpEffect, HttpRouter, HttpServerResponse } from "effect/http";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { WorkspaceScopeSchema } from "#workspace/domain/oauth-grant.ts";

import { BetterAuth } from "./better-auth.ts";
import { apiResourceOf, issuerOf } from "./oauth.ts";
import { authBasePath } from "./options.ts";
import { AuthSettings } from "./settings.ts";
import { makeTurns } from "./turns.ts";
import type { TurnKind } from "./turns.ts";

// OAuth discovery, which RFC 8414 and RFC 9728 place at the root of the
// origin, with the issuer's or the resource's path appended. Better Auth
// answers these outside its base path.
const authorizationServerMetadata = `/.well-known/oauth-authorization-server${authBasePath}`;

const protectedResourceMetadata = "/.well-known/oauth-protected-resource";

// Better Auth's routes that add to what a plan limits: an invitation or a
// member to a workspace's seats, a workspace to those an account owns free.
// Each counts, then writes, so requests sent together take turns.
const inviteRoute = "/organization/invite-member";

const acceptRoute = "/organization/accept-invitation";

const createRoute = "/organization/create";

const counted: ReadonlySet<string> = new Set([
  inviteRoute,
  acceptRoute,
  createRoute,
]);

// Ids as Better Auth issues them, an invitation's as a workspace's:
// lower-case UUIDs.
const BodySchema = Schema.Struct({
  invitationId: Schema.optionalKey(WorkspaceIdSchema),
  organizationId: Schema.optionalKey(WorkspaceIdSchema),
});

const decodeBody = Schema.decodeUnknownOption(BodySchema);

// The ids a body names, whatever they are.
const NamedSchema = Schema.Struct({
  invitationId: Schema.optionalKey(Schema.Unknown),
  organizationId: Schema.optionalKey(Schema.Unknown),
});

const decodeNamed = Schema.decodeUnknownOption(NamedSchema);

// A counted route's body that names an id in another form than Better
// Auth issues it: Postgres reads a UUID in any case, so capitals would
// name the same workspace or invitation, while the turn and the plan's
// check, which read the id as issued, would take it for none and let the
// request past both. It is refused before Better Auth sees it.
const namesAnId = (named: Option.Option<typeof NamedSchema.Type>): boolean =>
  Option.exists(
    named,
    ({ invitationId, organizationId }) =>
      invitationId !== undefined || organizationId !== undefined
  );

const malformedId = HttpServerResponse.jsonUnsafe(
  {
    code: "INVALID_ID",
    message:
      "organizationId and invitationId are lower-case UUIDs, as Peal issues them",
  },
  { status: 400 }
);

const decodeInvitation = Schema.decodeUnknownOption(
  Schema.Struct({ organizationId: Schema.String })
);

const decodeSession = Schema.decodeUnknownOption(
  Schema.Struct({
    session: Schema.Struct({
      activeOrganizationId: Schema.optionalKey(Schema.NullOr(Schema.String)),
    }),
    user: Schema.Struct({ id: Schema.String }),
  })
);

/**
 * Better Auth's own routes, on the server's router beside the HTTP API:
 * everything under /api/auth goes to its handler as a web Request, body
 * untouched, and so do the discovery documents of its OAuth authorization
 * server and of the MCP endpoint. The HTTP API's own resource metadata,
 * which tells the command line what to ask a token for, is answered here.
 * The routes that add to what a plan limits run one at a time for each
 * workspace or account (`makeTurns`), so none passes a limit with another.
 */
export const AuthRoutesLive = Layer.unwrap(
  Effect.gen(function* authRoutes() {
    const auth = yield* BetterAuth;
    const { publicUrl } = yield* AuthSettings;

    const { adapter } = yield* Effect.promise(async () => await auth.$context);
    const withTurn = yield* makeTurns;
    const runPromise = Effect.runPromiseWith(yield* Effect.context());

    // Who a request is from, and the workspace their session is in.
    const sessionOf = async (request: Request) =>
      decodeSession(
        await auth.api.getSession({
          headers: request.headers,
          query: { disableRefresh: true },
        })
      );

    // What a request must take its turn on, if it adds a member, an
    // invitation or a workspace: the workspace it names, or the session's;
    // the invitation's workspace; the account creating. "refused" for a
    // body that names an id in a form the turn cannot be taken on.
    const turnOf = async (
      request: Request
    ): Promise<Option.Option<readonly [TurnKind, string]> | "refused"> => {
      const route = new URL(request.url).pathname.slice(authBasePath.length);

      if (request.method !== "POST" || !counted.has(route)) {
        return Option.none();
      }

      const json: unknown = await request
        .clone()
        .json()
        .catch(() => null);

      const issued = decodeBody(json);

      if (Option.isNone(issued) && namesAnId(decodeNamed(json))) {
        return "refused";
      }

      const body = Option.getOrElse(issued, (): typeof BodySchema.Type => ({}));

      if (route === acceptRoute) {
        const found: unknown =
          body.invitationId === undefined
            ? null
            : await adapter.findOne({
                model: "invitation",
                select: ["organizationId"],
                where: [{ field: "id", value: body.invitationId }],
              });

        return decodeInvitation(found).pipe(
          Option.map(({ organizationId }) => ["seats", organizationId] as const)
        );
      }

      if (route === inviteRoute && body.organizationId !== undefined) {
        return Option.some(["seats", body.organizationId] as const);
      }

      const session = await sessionOf(request);

      return route === inviteRoute
        ? session.pipe(
            Option.flatMapNullishOr(
              ({ session: { activeOrganizationId } }) => activeOrganizationId
            ),
            Option.map((workspaceId) => ["seats", workspaceId] as const)
          )
        : session.pipe(
            Option.map(({ user }) => ["creations", user.id] as const)
          );
    };

    const handle = HttpEffect.fromWebHandler(async (request) => {
      const turn = await turnOf(request);

      if (turn === "refused") {
        return HttpServerResponse.toWeb(malformedId);
      }

      return Option.isNone(turn)
        ? await auth.handler(request)
        : await runPromise(
            withTurn(
              turn.value[0],
              turn.value[1],
              Effect.promise(async () => await auth.handler(request))
            )
          );
    }).pipe(Effect.withSpan("BetterAuth.handler"));

    // RFC 9728 protected resource metadata for the HTTP API.
    const apiResource = HttpServerResponse.jsonUnsafe(
      {
        authorization_servers: [issuerOf(publicUrl)],
        bearer_methods_supported: ["header"],
        resource: apiResourceOf(publicUrl),
        scopes_supported: WorkspaceScopeSchema.literals,
      },
      { headers: { "cache-control": "public, max-age=3600" } }
    );

    return HttpRouter.addAll([
      HttpRouter.route("*", `${authBasePath}/*`, handle),
      HttpRouter.route("*", authorizationServerMetadata, handle),
      HttpRouter.route("*", protectedResourceMetadata, handle),
      HttpRouter.route("*", `${protectedResourceMetadata}/api/mcp`, handle),
      HttpRouter.route(
        "GET",
        `${protectedResourceMetadata}/api`,
        Effect.succeed(apiResource)
      ),
    ]);
  })
);
