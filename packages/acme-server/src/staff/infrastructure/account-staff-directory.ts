import { Effect, Layer } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import { StaffDirectory } from "#staff/application/ports/staff-directory.ts";
import { AccountDirectory } from "#workspace/application/account-directory.ts";
import type { DirectoryUnavailable } from "#workspace/application/directory-unavailable.ts";

const unavailable = Effect.mapError(
  ({ cause }: DirectoryUnavailable) => new DatabaseError({ cause })
);

/** The accounts and workspaces the workspace context's directory reads. */
export const AccountStaffDirectory = Layer.effect(
  StaffDirectory,
  Effect.gen(function* AccountStaffDirectory() {
    const directory = yield* AccountDirectory;

    return StaffDirectory.of({
      people: (userIds) => directory.people(userIds).pipe(unavailable),
      user: (userId, now) => directory.account(userId, now).pipe(unavailable),
      users: (search) => directory.accounts(search).pipe(unavailable),
      workspace: (workspaceId) =>
        directory.workspace(workspaceId).pipe(unavailable),
      workspaces: (search) => directory.workspaces(search).pipe(unavailable),
    });
  })
);
