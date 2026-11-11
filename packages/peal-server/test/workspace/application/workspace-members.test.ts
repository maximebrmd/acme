import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";

import { Actor } from "#shared/domain/access.ts";
import type { ActorSubject } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";
import { WorkspaceMembers } from "#workspace/application/workspace-members.ts";
import type { NewInvitation } from "#workspace/application/workspace-members.ts";
import { WorkspacePeople } from "#workspace/application/workspace-people.ts";
import type { InvitationRequest } from "#workspace/application/workspace-people.ts";
import { Invitation } from "#workspace/domain/invitation.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// An account without two-step verification, in a workspace that does not
// require it.
const noTwoStep = { enabled: false, required: false };

const workspaceId = WorkspaceIdSchema.make(
  "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"
);

const userId = UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7");

const staffId = UserIdSchema.make("1c7f3a5b-4d2e-4f60-9bac-2d3e4f5a6b7c");

const at = DateTime.makeUnsafe("2026-11-09T12:00:00Z");

const pending = (id: string, role: string) =>
  new Invitation({
    createdAt: at,
    email: `${id}@example.test`,
    expiresAt: DateTime.add(at, { days: 7 }),
    id,
    inviterId: userId,
    role,
    workspaceId,
  });

const colleagueId = UserIdSchema.make("2d8a4b6c-5e3f-4a71-8cbd-3e4f5a6b7c8d");

const guestId = UserIdSchema.make("3e9b5c7d-6f4a-4b82-9dce-4f5a6b7c8d9e");

// The workspace's members: the user, who holds the role each test gives
// them in the directory, and two others.
const seated = [
  {
    email: "user@example.test",
    joinedAt: at,
    name: "User",
    role: "owner",
    userId,
  },
  {
    email: "colleague@example.test",
    joinedAt: at,
    name: "Colleague",
    role: "editor",
    userId: colleagueId,
  },
  {
    email: "guest@example.test",
    joinedAt: at,
    name: "Guest",
    role: "viewer",
    userId: guestId,
  },
];

const actor = (role: string, subject: ActorSubject) =>
  new Actor({ permissions: permissionsFor(role), subject, workspaceId });

const inPerson: ActorSubject = {
  _tag: "user",
  impersonatedBy: Option.none(),
  userId,
};

const impersonated: ActorSubject = {
  _tag: "user",
  impersonatedBy: Option.some(staffId),
  userId,
};

const apiKey: ActorSubject = { _tag: "apiKey", apiKeyId: "synthetic-key" };

// The member holds `role` in the directory; the port keeps what it was
// asked to send and revoke.
const run = <A, E>(
  role: string,
  test: (
    asked: Ref.Ref<readonly string[]>
  ) => Effect.Effect<A, E, WorkspaceMembers>
) =>
  Effect.gen(function* withFakes() {
    const asked = yield* Ref.make<readonly string[]>([]);

    const people = Layer.succeed(
      WorkspacePeople,
      WorkspacePeople.of({
        invite: (request: InvitationRequest) =>
          Ref.update(asked, (all) => [...all, `invite:${request.role}`]).pipe(
            Effect.as(pending("sent", request.role))
          ),
        members: () => Effect.succeed(seated),
        pendingInvitations: () =>
          Effect.succeed([
            pending("crown", "owner"),
            pending("desk", "editor"),
          ]),
        removeMembers: (_workspace, userIds) =>
          Ref.update(asked, (all) => [
            ...all,
            ...userIds.map((id) => `remove:${id}`),
          ]).pipe(Effect.as(userIds.length)),
        reseating: (_workspace, change) => change,
        revoke: (_workspace, invitationId) =>
          Ref.update(asked, (all) => [...all, `revoke:${invitationId}`]).pipe(
            Effect.as(invitationId === "desk")
          ),
        revokeAll: () =>
          Ref.update(asked, (all) => [...all, "revokeAll"]).pipe(Effect.as(2)),
      })
    );

    const directory = Layer.succeed(
      MemberDirectory,
      MemberDirectory.of({
        account: () => Effect.succeed(Option.none()),
        membership: () =>
          Effect.succeed(
            Option.some({ ban: Option.none(), role, twoStep: noTwoStep })
          ),
      })
    );

    return yield* test(asked).pipe(
      Effect.provide(
        WorkspaceMembers.layer.pipe(
          Layer.provide(Layer.mergeAll(people, directory))
        )
      )
    );
  });

const failure = <A, E extends { readonly _tag: string }, R>(
  effect: Effect.Effect<A, E, R>
) =>
  effect.pipe(
    Effect.flip,
    Effect.map(({ _tag }) => _tag)
  );

describe(WorkspaceMembers, () => {
  it.effect("shows invitations to the owner role to owners only", () =>
    Effect.gen(function* visible() {
      const byOwner = yield* run("owner", () =>
        WorkspaceMembers.use((members) =>
          members.invitations(actor("owner", inPerson))
        )
      );

      const byAdmin = yield* run("admin", () =>
        WorkspaceMembers.use((members) =>
          members.invitations(actor("admin", inPerson))
        )
      );

      assert.deepStrictEqual(
        byOwner.map(({ id }) => id),
        ["crown", "desk"]
      );
      assert.deepStrictEqual(
        byAdmin.map(({ id }) => id),
        ["desk"]
      );
    })
  );

  it.effect("lets owners invite owners, and nobody else, in person only", () =>
    Effect.gen(function* invites() {
      const asked = yield* run("owner", (sent) =>
        WorkspaceMembers.use((members) =>
          members
            .invite(actor("owner", inPerson), {
              email: "partner@example.test",
              role: "owner",
            })
            .pipe(Effect.andThen(Ref.get(sent)))
        )
      );

      assert.deepStrictEqual(asked, ["invite:owner"]);

      const refusals = yield* run("admin", (sent) =>
        WorkspaceMembers.use((members) =>
          Effect.gen(function* refused() {
            const newcomer: NewInvitation = {
              email: "newcomer@example.test",
              role: "viewer",
            };

            const byApiKey = yield* failure(
              members.invite(actor("admin", apiKey), newcomer)
            );

            const byEditor = yield* failure(
              members.invite(actor("editor", inPerson), newcomer)
            );

            const byStaff = yield* failure(
              members.invite(actor("admin", impersonated), newcomer)
            );

            const owner = yield* failure(
              members.invite(actor("admin", inPerson), {
                ...newcomer,
                role: "owner",
              })
            );

            // Read last: nothing reached the port.
            return {
              asked: yield* Ref.get(sent),
              byApiKey,
              byEditor,
              byStaff,
              owner,
            };
          })
        )
      );

      assert.deepStrictEqual(refusals, {
        asked: [],
        byApiKey: "UserRequired",
        byEditor: "MissingPermission",
        byStaff: "MissingPermission",
        owner: "RoleNotInvitable",
      });
    })
  );

  it.effect(
    "revokes a pending invitation for those who may cancel them, in person",
    () =>
      Effect.gen(function* revokes() {
        const outcome = yield* run("admin", (sent) =>
          WorkspaceMembers.use((members) =>
            Effect.gen(function* revoking() {
              yield* members.revokeInvitation(actor("admin", inPerson), "desk");

              const byStaff = yield* failure(
                members.revokeInvitation(actor("admin", impersonated), "desk")
              );

              const byViewer = yield* failure(
                members.revokeInvitation(actor("viewer", inPerson), "desk")
              );

              const unknown = yield* failure(
                members.revokeInvitation(actor("admin", inPerson), "gone")
              );

              // Read last: what the port was asked, all along.
              return {
                asked: yield* Ref.get(sent),
                byStaff,
                byViewer,
                unknown,
              };
            })
          )
        );

        assert.deepStrictEqual(outcome, {
          asked: ["revoke:desk", "revoke:gone"],
          byStaff: "MissingPermission",
          byViewer: "MissingPermission",
          unknown: "InvitationNotFound",
        });
      })
  );

  it.effect(
    "keeps only the members chosen, and revokes the pending invitations",
    () =>
      Effect.gen(function* keeps() {
        const outcome = yield* run("owner", (asked) =>
          WorkspaceMembers.use((members) =>
            Effect.all({
              byStaff: failure(
                members.keepOnly(actor("owner", impersonated), [userId])
              ),
              byViewer: failure(
                members.keepOnly(actor("viewer", inPerson), [userId])
              ),
              freed: members.keepOnly(actor("owner", inPerson), [
                userId,
                guestId,
              ]),
              unknown: failure(
                members.keepOnly(actor("owner", inPerson), [
                  userId,
                  "not-an-id",
                ])
              ),
              withoutSelf: failure(
                members.keepOnly(actor("owner", inPerson), [guestId])
              ),
            }).pipe(
              Effect.flatMap((done) =>
                Ref.get(asked).pipe(
                  Effect.map((all) => ({ ...done, asked: all }))
                )
              )
            )
          )
        );

        assert.deepStrictEqual(outcome, {
          asked: [`remove:${colleagueId}`, "revokeAll"],
          byStaff: "MissingPermission",
          byViewer: "MissingPermission",
          freed: { removed: 1, revoked: 2 },
          unknown: "MembersNotRemovable",
          withoutSelf: "MembersNotRemovable",
        });
      })
  );

  it.effect("lists the members to people, and to no API key", () =>
    Effect.gen(function* lists() {
      const refused = yield* run("viewer", () =>
        WorkspaceMembers.use((members) =>
          failure(members.list(actor("owner", apiKey)))
        )
      );

      const listed = yield* run("viewer", () =>
        WorkspaceMembers.use((members) =>
          members.list(actor("viewer", inPerson))
        )
      );

      assert.strictEqual(refused, "UserRequired");
      assert.deepStrictEqual(listed, seated);
    })
  );
});
