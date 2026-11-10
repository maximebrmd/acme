import { describe, expect, it } from "@effect/vitest";
import { Result } from "effect";

import { UserIdSchema } from "#shared/domain/ids.ts";
import { membersToRemove } from "#workspace/domain/member-removal.ts";
import { MembersNotRemovable } from "#workspace/domain/members-not-removable.ts";

const owner = UserIdSchema.make("11111111-1111-4111-8111-111111111111");
const admin = UserIdSchema.make("22222222-2222-4222-8222-222222222222");
const editor = UserIdSchema.make("33333333-3333-4333-8333-333333333333");
const viewer = UserIdSchema.make("44444444-4444-4444-8444-444444444444");
const stranger = UserIdSchema.make("55555555-5555-4555-8555-555555555555");

const members = [
  { role: "owner", userId: owner },
  { role: "admin", userId: admin },
  { role: "editor", userId: editor },
  { role: "viewer", userId: viewer },
];

const refused = (reason: MembersNotRemovable["reason"]) =>
  Result.fail(new MembersNotRemovable({ reason }));

describe(membersToRemove, () => {
  it("removes every member but those kept", () => {
    expect(membersToRemove(owner, members, [owner, editor])).toStrictEqual(
      Result.succeed([admin, viewer])
    );
    expect(
      membersToRemove(admin, members, [owner, admin, viewer])
    ).toStrictEqual(Result.succeed([editor]));
  });

  it("keeps whoever chooses", () => {
    expect(membersToRemove(owner, members, [admin])).toStrictEqual(
      refused("selfRequired")
    );
  });

  it("lets only an owner remove an owner", () => {
    expect(membersToRemove(admin, members, [admin, editor])).toStrictEqual(
      refused("ownerRequired")
    );
  });

  it("refuses to keep someone who is not a member", () => {
    expect(membersToRemove(owner, members, [owner, stranger])).toStrictEqual(
      refused("unknownMember")
    );
  });

  it("refuses someone who is not a member themselves", () => {
    expect(membersToRemove(stranger, members, [stranger])).toStrictEqual(
      refused("unknownMember")
    );
  });
});
