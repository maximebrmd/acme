import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

import type { DirectoryUnavailable } from "./directory-unavailable.ts";

/** An account, and the workspaces where its role allows something. */
export interface HeldAccount {
  readonly email: string;
  readonly locale: Locale;
  readonly userId: UserId;
  readonly workspaces: readonly {
    readonly id: WorkspaceId;
    readonly name: string;
  }[];
}

/**
 * Finds the account an email address signs in to, whatever its case, or an
 * account by its id, with the workspaces where its role allows
 * `permission`: for a request that comes without a session, such as a
 * contract's cancellation. A banned account is found too: a ban takes no
 * right to end a contract away. Never tell whoever asks whether one was
 * found.
 */
export class AccountLookup extends Context.Service<
  AccountLookup,
  {
    readonly byEmail: (
      email: string,
      permission: Permission
    ) => Effect.Effect<Option.Option<HeldAccount>, DirectoryUnavailable>;
    readonly byId: (
      userId: UserId,
      permission: Permission
    ) => Effect.Effect<Option.Option<HeldAccount>, DirectoryUnavailable>;
  }
>()("peal-server/workspace/application/AccountLookup") {}
