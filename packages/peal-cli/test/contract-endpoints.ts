import { HttpApi, HttpApiMiddleware } from "effect/http-api";
import { Api } from "peal-contract";

/** One endpoint of the contract, as `group.endpoint` names it. */
export interface ContractEndpoint {
  /** Whether a bearer token may call it. */
  readonly bearer: boolean;
  readonly group: string;
  /** `group.endpoint`, the SDKs' method: `posts.schedule`. */
  readonly id: string;
  readonly method: string;
  /** The path, with each parameter as `{}`. */
  readonly path: string;
}

/** A path with its parameters' names left out: `:id` and `{id}` alike. */
export const pathPattern = (path: string): string =>
  path.replaceAll(/:[A-Za-z]+|\{[A-Za-z]+\}|<[a-z-]+>|\$[A-Z_]+/gu, "{}");

const reflected = (): readonly ContractEndpoint[] => {
  const endpoints: ContractEndpoint[] = [];

  HttpApi.reflect(Api, {
    onEndpoint: ({ endpoint, group, middleware }) => {
      const name = Object.entries(group.endpoints).find(
        ([, declared]) => declared === endpoint
      )?.[0];

      endpoints.push({
        bearer: [...middleware].some(
          (service) =>
            HttpApiMiddleware.isSecurity(service) &&
            "bearer" in service.security
        ),
        group: group.identifier,
        id: `${group.identifier}.${name ?? ""}`,
        method: endpoint.method,
        path: pathPattern(endpoint.path),
      });
    },
    onGroup: () => {
      // Endpoints carry what this reads.
    },
  });

  return endpoints;
};

/** Every endpoint of the contract. */
export const contractEndpoints = reflected();

// The groups that answer only the person in their own session, as
// packages/peal-sdk/scripts/spec.ts lists them (`ownSessionTags`): keep
// both equal.
const ownSessionGroups = new Set([
  "account",
  "billingActions",
  "connectedApps",
  "workspaces",
]);

// The group anyone calls, without credentials (`publicTag` there).
const publicGroup = "system";

/**
 * The endpoints a bearer token can call, by the rule the SDKs are
 * generated with: those whose security allows a bearer token, less the
 * groups of the person's own session, and the health checks.
 */
export const tokenEndpoints = contractEndpoints.filter(
  ({ bearer, group }) =>
    group === publicGroup || (bearer && !ownSessionGroups.has(group))
);
