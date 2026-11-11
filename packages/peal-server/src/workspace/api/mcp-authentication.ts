import { Effect, Option, Redacted, Result, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
import { CurrentMember } from "peal-contract";

import { Authenticate } from "#workspace/application/authenticate.ts";
import { ConnectionJournal } from "#workspace/application/connection-journal.ts";
import { RequestLimits } from "#workspace/application/request-limits.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";
import { answerAccessDenied } from "#workspace/domain/membership.ts";
import type { AccessDenied } from "#workspace/domain/membership.ts";
import type { Principal } from "#workspace/domain/principal.ts";

import { memberOf } from "./principal.ts";
import { pastLimit, limitHeaders } from "./rate-limit.ts";
import { contentChangeOf, journalled } from "./security.ts";

/**
 * The header a partner key's client names its workspace in, on the MCP
 * endpoint: the id of a workspace the key's partner owns.
 */
export const workspaceHeaderName = "Peal-Workspace";

const workspaceHeader = workspaceHeaderName.toLowerCase();

// A JSON-RPC call of a tool, alone or in a batch.
const ToolCallSchema = Schema.Struct({
  method: Schema.Literal("tools/call"),
  params: Schema.Struct({ name: Schema.String }),
});

const decodeMessage = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Unknown)
);

const decodeToolCall = Schema.decodeUnknownOption(ToolCallSchema);

/** The tools a request's body calls, by name. */
const toolsCalled = (body: string): readonly string[] =>
  Option.match(decodeMessage(body), {
    onNone: () => [],
    onSome: (message) =>
      (Array.isArray(message) ? message : [message]).flatMap((item) =>
        Option.match(decodeToolCall(item), {
          onNone: () => [],
          onSome: (call) => [call.params.name],
        })
      ),
  });

// MCP clients read a JSON-RPC error alongside the HTTP status, as Better
// Auth's requireMcpAuth sends it; -32000 is the implementation-defined code
// it uses.
const jsonRpcError = (
  status: number,
  message: string,
  headers: Readonly<Record<string, string>> = {}
) =>
  HttpServerResponse.jsonUnsafe(
    { error: { code: -32_000, message }, id: null, jsonrpc: "2.0" },
    { headers, status }
  );

// The token works, but its user can no longer act in its workspace. Signing
// in again would not help, so there is no challenge.
const closed = () =>
  jsonRpcError(403, "The workspace this token is bound to is not open to you");

/**
 * What a credential refused its workspace is told: a partner key, that no
 * workspace it acts in has that id, as the API tells it; a person whose
 * account lacks the two-step verification the workspace requires, what to
 * do; anyone else, that the workspace is not open to them.
 */
const refusalOf = (principal: Principal, denied: AccessDenied) =>
  answerAccessDenied({
    BannedUser: closed,
    NotAMember: () =>
      principal._tag === "PartnerKeyPrincipal"
        ? jsonRpcError(
            404,
            `No such workspace: the ${workspaceHeaderName} header names none this partner key acts in.`
          )
        : closed(),
    TwoStepRequired: () =>
      jsonRpcError(
        403,
        "This workspace requires two-step verification. Turn it on in your Peal account settings, then try again."
      ),
    WorkspaceMismatch: closed,
  })(denied);

/**
 * Authentication for the MCP endpoint, as Better Auth's requireMcpAuth does
 * it: a request without an OAuth access token issued for the endpoint, or
 * with one that no longer works, gets a 401 whose RFC 9728 challenge leads
 * the client to sign in; one lacking scopes, a 403 that asks for them. A
 * token works in the workspace it is bound to, while its user still belongs
 * to it and is not banned, which is checked on every request. An API key
 * works in its workspace; a partner key in the workspace it names in the
 * `Peal-Workspace` header, when its partner owns it. Routes behind it get
 * the member as CurrentMember.
 *
 * A request that calls one of `contentTools`, those that create, change or
 * delete content, is kept in the ConnectionJournal once answered without
 * an error, as the API's writes to posts and media are.
 */
export const mcpAuthentication = ({
  contentTools,
}: {
  /** The tools that create, change or delete posts and media. */
  readonly contentTools: ReadonlySet<string>;
}) =>
  HttpRouter.middleware<{
    provides: CurrentMember;
  }>()(
    Effect.gen(function* mcpAuthenticationLive() {
      const authenticate = yield* Authenticate;
      const members = yield* ResolveMember;
      const journal = yield* ConnectionJournal;
      const limits = yield* RequestLimits;

      return (httpEffect) =>
        Effect.gen(function* authenticated() {
          const request = yield* HttpServerRequest.HttpServerRequest;

          const { principal, workspaceId } = yield* authenticate.mcp({
            authorization: Option.fromNullishOr(
              request.headers["authorization"]
            ).pipe(Option.map(Redacted.make)),
            dpopProof: Option.fromNullishOr(request.headers["dpop"]),
            method: request.method,
            path: request.url,
            workspace: Option.fromNullishOr(request.headers[workspaceHeader]),
          });

          // The same count as the API's: a credential has one limit,
          // wherever it sends its requests.
          const limited = yield* pastLimit(limits, principal);

          if (Option.isSome(limited)) {
            return jsonRpcError(
              429,
              `Too many requests: this credential may send ${String(limited.value.limit)} every ${String(limited.value.windowSeconds)} seconds. Try again in ${String(limited.value.resetAfterSeconds)} seconds.`,
              Object.fromEntries(limitHeaders(limited.value))
            );
          }

          // A partner key in a workspace its partner does not own, its
          // home workspace included, is told there is no such workspace,
          // as the API tells it.
          const resolved = yield* members.resolve(principal, workspaceId).pipe(
            Effect.map((actor) => Result.succeed(actor)),
            Effect.catchTag("DirectoryUnavailable", Effect.die),
            Effect.catch((error) =>
              Effect.succeed(Result.fail(refusalOf(principal, error)))
            )
          );

          if (Result.isFailure(resolved)) {
            return resolved.failure;
          }

          const member = memberOf(resolved.success, principal);

          // The body is read once and kept, so the MCP server reads it again.
          const called =
            request.method === "POST"
              ? toolsCalled(
                  yield* request.text.pipe(Effect.orElseSucceed(() => ""))
                )
              : [];

          const answered = httpEffect.pipe(
            Effect.provideService(CurrentMember, member)
          );

          const changesContent = called.some((name) => contentTools.has(name));

          if (!changesContent) {
            return yield* answered;
          }

          return yield* answered.pipe(
            Effect.flatMap(
              journalled(journal, () =>
                contentChangeOf(
                  principal,
                  "mcp",
                  request,
                  Option.some(workspaceId)
                )
              )
            )
          );
        }).pipe(
          Effect.catchTags({
            AuthUnavailable: Effect.die,
            InvalidAccessToken: ({ challenge, description, status }) =>
              Effect.succeed(
                jsonRpcError(status, description, {
                  "www-authenticate": challenge,
                })
              ),
            WorkspaceNotNamed: () =>
              Effect.succeed(
                jsonRpcError(
                  400,
                  `A partner key acts in one workspace at a time here: send the id of a workspace its partner owns in the ${workspaceHeaderName} header.`
                )
              ),
          })
        );
    })
  ).layer;
