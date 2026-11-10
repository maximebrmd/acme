import { Effect, Layer, Option, Ref } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { deviceCodeGrantType, OAuthApi } from "peal-contract";
import type { DeviceAuthorization, Token } from "peal-contract";

// An OAuth authorization server for the command line's tests, answering
// peal-contract's OAuthApi as Better Auth does on a Peal server whose
// public URL is publicUrl. The user approves (or denies) the sign-in after
// the command line asked for tokens `approveAfter` times.

export const publicUrl = "http://localhost:3001";

export const userCode = "WDJBMJHT";

const deviceCode = "synthetic-device-code";

const issuer = `${publicUrl}/api/auth`;

export const accessTokenOf = (generation: number) =>
  `synthetic-access-${String(generation)}`;

export const refreshTokenOf = (generation: number) =>
  `synthetic-refresh-${String(generation)}`;

export interface AuthorizationState {
  /** The device authorization requests the command line sent. */
  readonly deviceRequests: readonly {
    readonly client_id: string;
    readonly resource?: string;
    readonly scope?: string;
  }[];
  /** How many token pairs were issued; the last one works. */
  readonly generation: number;
  /** How many times the command line asked for the device's tokens. */
  readonly polls: number;
  readonly revoked: readonly string[];
}

export interface AuthorizationServerOptions {
  readonly approveAfter?: number;
  readonly deny?: boolean;
  /** Whether MCP clients may register themselves. */
  readonly registration?: boolean;
  /** The scopes the user approves: all the command line asks for, unless told. */
  readonly scope?: string;
}

/** Everything the command line asks for, scheduling and publishing included. */
export const fullScope =
  "offline_access workspace:read workspace:write workspace:publish";

const refused = (error: string) => Effect.fail({ error });

export const makeAuthorizationServer = Effect.fn("makeAuthorizationServer")(
  function* makeAuthorizationServer(options: AuthorizationServerOptions = {}) {
    const scope = options.scope ?? fullScope;

    const state = yield* Ref.make<AuthorizationState>({
      deviceRequests: [],
      generation: 0,
      polls: 0,
      revoked: [],
    });

    const issue = Ref.modify(state, (current): [Token, AuthorizationState] => {
      const generation = current.generation + 1;

      return [
        {
          access_token: accessTokenOf(generation),
          expires_in: 900,
          refresh_token: refreshTokenOf(generation),
          scope,
          token_type: "Bearer",
        },
        { ...current, generation },
      ];
    });

    const device: DeviceAuthorization = {
      device_code: deviceCode,
      expires_in: 600,
      interval: 5,
      user_code: userCode,
      verification_uri: `${publicUrl}/device`,
      verification_uri_complete: `${publicUrl}/device?user_code=${userCode}`,
    };

    const discovery = HttpApiBuilder.group(OAuthApi, "discovery", (handlers) =>
      handlers.handleAll({
        apiResource: () =>
          Effect.succeed({
            authorization_servers: [issuer],
            resource: `${publicUrl}/api`,
          }),
        authorizationServer: () =>
          Effect.succeed(
            options.registration === true
              ? {
                  device_authorization_endpoint: `${issuer}/device/code`,
                  issuer,
                  registration_endpoint: `${issuer}/oauth2/register`,
                  token_endpoint: `${issuer}/oauth2/token`,
                }
              : {
                  device_authorization_endpoint: `${issuer}/device/code`,
                  issuer,
                  token_endpoint: `${issuer}/oauth2/token`,
                }
          ),
        mcpResource: () =>
          Effect.succeed({
            authorization_servers: [issuer],
            resource: `${publicUrl}/api/mcp`,
          }),
      })
    );

    const tokens = HttpApiBuilder.group(OAuthApi, "tokens", (handlers) =>
      handlers.handleAll({
        deviceAuthorization: ({ payload }) =>
          Ref.update(state, (current) => ({
            ...current,
            deviceRequests: [...current.deviceRequests, payload],
          })).pipe(Effect.as(device)),
        revoke: ({ payload }) =>
          Ref.update(state, (current) => ({
            ...current,
            revoked: [...current.revoked, payload.token],
          })),
        token: ({ payload }) =>
          Effect.gen(function* token() {
            const current = yield* Ref.updateAndGet(state, (before) =>
              payload.grant_type === deviceCodeGrantType
                ? { ...before, polls: before.polls + 1 }
                : before
            );

            if (payload.grant_type === deviceCodeGrantType) {
              if (payload.device_code !== deviceCode) {
                return yield* refused("invalid_grant");
              }

              if (current.polls <= (options.approveAfter ?? 0)) {
                return yield* refused("authorization_pending");
              }

              return options.deny === true
                ? yield* refused("access_denied")
                : yield* issue;
            }

            const works =
              payload.refresh_token === refreshTokenOf(current.generation) &&
              !current.revoked.includes(payload.refresh_token);

            return works ? yield* issue : yield* refused("invalid_grant");
          }),
      })
    );

    // The command line never asks for it; the web app's consent page does.
    const clients = HttpApiBuilder.group(OAuthApi, "clients", (handlers) =>
      handlers.handleAll({
        publicClient: ({ query }) =>
          Effect.succeed({ client_id: query.client_id }),
      })
    );

    return {
      /** The access token the API accepts, once one was issued. */
      acceptedToken: Ref.get(state).pipe(
        Effect.map(({ generation }) =>
          generation === 0
            ? Option.none()
            : Option.some(accessTokenOf(generation))
        )
      ),
      handlers: Layer.mergeAll(discovery, tokens, clients),
      /** The scopes its access tokens carry. */
      scopes: scope.split(" "),
      state: Ref.get(state),
    };
  }
);

export type AuthorizationServer = Effect.Success<
  ReturnType<typeof makeAuthorizationServer>
>;
