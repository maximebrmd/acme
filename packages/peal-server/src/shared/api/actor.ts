import type { Member } from "acme-contract";
import { Option } from "effect";

import { Actor } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * The actor behind CurrentMember, which the WorkspaceAccess middleware
 * provides to workspace endpoints. Handlers of every context pass it to
 * their use cases, which check it with `can` or `authorize`.
 */
export const actorOf = (member: Member): Actor => {
  const { principal } = member;

  return new Actor({
    permissions: member.permissions,
    subject:
      principal._tag === "user"
        ? {
            _tag: "user",
            impersonatedBy: Option.fromNullishOr(principal.impersonatedBy).pipe(
              Option.map((id) => UserIdSchema.make(id))
            ),
            userId: UserIdSchema.make(principal.userId),
          }
        : { _tag: "apiKey", apiKeyId: principal.apiKeyId },
    workspaceId: WorkspaceIdSchema.make(member.workspaceId),
  });
};
