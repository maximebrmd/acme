import type { GenericEndpointContext } from "better-auth";
import { APIError, getSessionFromCtx } from "better-auth/api";
import { Option, Schema } from "effect";

import { bodyIdsOf, changesWorkspace } from "./impersonation.ts";

/**
 * A request to Better Auth's routes that asked to change a workspace (its
 * members, their roles, its invitations, its subscription), once answered.
 */
export interface WorkspaceAuthChange {
  /** Whether the route did what was asked. */
  readonly done: boolean;
  /** The staff member acting as the user, if any. */
  readonly impersonatedBy: string | null;
  /** The ids its body names (`memberId`, `invitationId`…), never more. */
  readonly objectIds: Readonly<Record<string, string | undefined>>;
  /** `auth:` and the route's path. */
  readonly operation: string;
  readonly status: number;
  readonly userId: string;
  /**
   * The workspace the answer names, else the one the body names, else the
   * session's active one.
   */
  readonly workspaceId: string;
}

/** Keeps such a request in its workspace's activity log. */
export type WorkspaceChangeRecorder = (
  change: WorkspaceAuthChange
) => Promise<void>;

// A workspace Better Auth has only just made has no log to keep its
// making in; the session's active workspace is another one.
const makesWorkspace: ReadonlySet<string> = new Set(["/organization/create"]);

const decodeSession = Schema.decodeUnknownOption(
  Schema.Struct({
    session: Schema.Struct({
      activeOrganizationId: Schema.optional(Schema.NullOr(Schema.String)),
      impersonatedBy: Schema.optional(Schema.NullOr(Schema.String)),
    }),
    user: Schema.Struct({ id: Schema.NonEmptyString }),
  })
);

const named = Schema.Struct({ organizationId: Schema.NonEmptyString });

// What a route answered, where Better Auth keeps it for its after hooks:
// an invitation, a member, or something of a workspace itself; anything
// else, an error included, names none.
const decodeAnswered = Schema.decodeUnknownOption(
  Schema.Struct({
    returned: Schema.Union([
      Schema.Struct({ invitation: named }),
      Schema.Struct({ member: named }),
      named,
    ]),
  })
);

const decodeRefusal = Schema.decodeUnknownOption(
  Schema.Struct({ returned: Schema.instanceOf(APIError) })
);

/**
 * Better Auth's after hook: a request a browser sent to one of its routes
 * that change a workspace is handed to `record` once the route answered,
 * done or refused, as the API's writes are by WorkspaceAccess. Without it
 * a role changed, a member removed or an invitation sent from the web
 * app, which calls these routes, would leave nothing in the workspace's
 * activity log. Better Auth's calls from Peal's own API carry no request:
 * the API recorded them. A request the before hook refused never comes
 * here.
 */
export const recordWorkspaceChange = async (
  ctx: GenericEndpointContext,
  record: WorkspaceChangeRecorder
): Promise<void> => {
  const { request } = ctx;

  if (
    request === undefined ||
    request.method === "GET" ||
    request.method === "HEAD" ||
    !changesWorkspace(ctx.path) ||
    makesWorkspace.has(ctx.path)
  ) {
    return;
  }

  const found = decodeSession(
    await getSessionFromCtx(ctx, { disableRefresh: true })
  );

  if (Option.isNone(found)) {
    return;
  }

  const { session, user } = found.value;
  const refusal = decodeRefusal(ctx.context);
  const objectIds = bodyIdsOf(ctx);

  const workspaceId = decodeAnswered(ctx.context).pipe(
    Option.map(({ returned }) => {
      if ("invitation" in returned) {
        return returned.invitation.organizationId;
      }

      return "member" in returned
        ? returned.member.organizationId
        : returned.organizationId;
    }),
    Option.orElse(() =>
      Option.fromNullishOr(
        objectIds["organizationId"] ??
          objectIds["referenceId"] ??
          session.activeOrganizationId
      )
    )
  );

  if (Option.isNone(workspaceId)) {
    return;
  }

  await record({
    done: Option.isNone(refusal),
    impersonatedBy: session.impersonatedBy ?? null,
    objectIds,
    operation: `auth:${ctx.path}`,
    status: Option.match(refusal, {
      onNone: () => 200,
      onSome: ({ returned }) => returned.statusCode,
    }),
    userId: user.id,
    workspaceId: workspaceId.value,
  });
};
