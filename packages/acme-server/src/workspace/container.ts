import { Layer } from "effect";

import { BetterAuthLive } from "#workspace/infrastructure/auth/better-auth.ts";
import { AuthSettings } from "#workspace/infrastructure/auth/settings.ts";

/**
 * The workspace context's services: Better Auth, configured from the
 * environment. It needs the database, migrated, and the notifications
 * context's SendAuthEmail.
 */
export const WorkspaceLive = BetterAuthLive.pipe(
  Layer.provide(AuthSettings.layer)
);

/** Better Auth's routes under /api/auth. */
export { AuthRoutesLive } from "#workspace/infrastructure/auth/routes.ts";
