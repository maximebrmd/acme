import { Effect, Option, Redacted, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
import { CurrentMember } from "peal-contract";

import { ActivityJournal } from "#workspace/application/activity-journal.ts";
import { Authenticate } from "#workspace/application/authenticate.ts";
import { ConnectionJournal } from "#workspace/application/connection-journal.ts";
import { RequestLimits } from "#workspace/application/request-limits.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";

import { recordToolCall } from "./activity-recording.ts";
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
const forbidden = () =>
  Effect.succeed(
    jsonRpcError(403, "The workspace this token is bound to is not open to you")
  );

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
 * A request that calls one of `changingTools` is kept in the workspace's
 * activity log (ActivityJournal), by the tool's name.
 *
 * A request that calls one of `contentTools`, those that create, change or
 * delete content, is kept in the ConnectionJournal once answered without
 * an error, as the API's writes to posts and media are.
 */
export const mcpAuthentication = ({
  changingTools,
  contentTools,
}: {
  /** The tools that change something: their calls go to the activity log. */
  readonly changingTools: ReadonlySet<string>;
  /** Those of them that create, change or delete posts and media. */
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
      const activity = yield* ActivityJournal;

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
            Effect.asSome,
            Effect.catchTag("NotAMember", (denied) =>
              principal._tag === "PartnerKeyPrincipal"
                ? Effect.succeedNone
                : Effect.fail(denied)
            )
          );

          if (Option.isNone(resolved)) {
            return jsonRpcError(
              404,
              `No such workspace: the ${workspaceHeaderName} header names none this partner key acts in.`
            );
          }

          const member = memberOf(resolved.value, principal);

          // The body is read once and kept, so the MCP server reads it again.
          const called =
            request.method === "POST"
              ? toolsCalled(
                  yield* request.text.pipe(Effect.orElseSucceed(() => ""))
                )
              : [];

          // Each call of a tool that changes something is kept in the
          // workspace's activity log once the request is answered, as the
          // API's writes are.
          const answered = httpEffect.pipe(
            Effect.provideService(CurrentMember, member),
            Effect.tap(() =>
              Effect.forEach(
                called.filter((name) => changingTools.has(name)),
                (tool) => recordToolCall(activity, { member, tool }),
                { discard: true }
              )
            )
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
            BannedUser: forbidden,
            DirectoryUnavailable: Effect.die,
            InvalidAccessToken: ({ challenge, description, status }) =>
              Effect.succeed(
                jsonRpcError(status, description, {
                  "www-authenticate": challenge,
                })
              ),
            NotAMember: forbidden,
            WorkspaceMismatch: forbidden,
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
