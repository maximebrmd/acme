import { createAccessControl } from "better-auth/plugins/access";

import { statements } from "#shared/domain/access.ts";
import { roleGrants } from "#workspace/domain/roles.ts";

// Peal's permission vocabulary and roles, as Better Auth's organization and
// API key plugins check them. The domain is the source: these only translate.
export const accessControl = createAccessControl(statements);

export const roles = {
  admin: accessControl.newRole(roleGrants.admin),
  contributor: accessControl.newRole(roleGrants.contributor),
  editor: accessControl.newRole(roleGrants.editor),
  owner: accessControl.newRole(roleGrants.owner),
  viewer: accessControl.newRole(roleGrants.viewer),
};
