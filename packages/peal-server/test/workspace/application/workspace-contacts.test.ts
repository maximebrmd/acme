import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { WorkspaceContacts } from "#workspace/application/workspace-contacts.ts";
import { WorkspaceRoster } from "#workspace/application/workspace-roster.ts";
import type { RosterMember } from "#workspace/application/workspace-roster.ts";

const workspaceId = WorkspaceIdSchema.make(
  "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"
);

const memberWith = (
  name: string,
  role: string,
  options: Partial<Pick<RosterMember, "ban" | "locale">> = {}
): RosterMember => ({
  ban: options.ban ?? Option.none(),
  email: `${name}@example.test`,
  locale: options.locale ?? "en",
  role,
  userId: UserIdSchema.make(
    `${name.padEnd(8, "0").slice(0, 8)}-1a2b-4c3d-8e9f-0a1b2c3d4e5f`
  ),
});

const contactsWith = (members: readonly RosterMember[]) =>
  WorkspaceContacts.layer.pipe(
    Layer.provide(
      Layer.succeed(
        WorkspaceRoster,
        WorkspaceRoster.of({
          members: (id) =>
            Effect.succeed(
              id === workspaceId
                ? Option.some({ members, name: "Studio Nord" })
                : Option.none()
            ),
          seatsIn: () => Effect.die("not read here"),
          seatsPage: () => Effect.succeed([]),
        })
      )
    )
  );

describe(WorkspaceContacts, () => {
  it.effect("names the members a permission is granted to", () =>
    Effect.gen(function* granted() {
      const now = yield* DateTime.now;

      const found = yield* WorkspaceContacts.use((contacts) =>
        contacts.withPermission(workspaceId, "channel:connect")
      ).pipe(
        Effect.provide(
          contactsWith([
            memberWith("abcdef01", "owner"),
            memberWith("abcdef02", "admin", { locale: "fr" }),
            memberWith("abcdef03", "editor"),
            memberWith("abcdef04", "viewer"),
            memberWith("abcdef05", "admin", {
              ban: Option.some({
                expiresAt: Option.some(DateTime.add(now, { days: 1 })),
              }),
            }),
          ])
        )
      );

      assert.strictEqual(found.workspaceName, "Studio Nord");
      assert.deepStrictEqual(
        found.contacts.map(({ email, locale }) => ({ email, locale })),
        [
          { email: "abcdef01@example.test", locale: "en" },
          { email: "abcdef02@example.test", locale: "fr" },
        ]
      );
    })
  );

  it.effect("has nobody to tell in a workspace that is gone", () =>
    Effect.gen(function* gone() {
      const found = yield* WorkspaceContacts.use((contacts) =>
        contacts.withPermission(
          WorkspaceIdSchema.make("6c2d6f8e-4e3b-4d2c-8f9e-8b7c6d5e4f3a"),
          "channel:connect"
        )
      ).pipe(Effect.provide(contactsWith([memberWith("abcdef01", "owner")])));

      assert.deepStrictEqual(found.contacts, []);
    })
  );
});
