import { describe, expect, it } from "@effect/vitest";

import { MembersView } from "#components/settings/members-list.tsx";
import {
  RequireConfirmation,
  WorkspaceSecurityView,
} from "#components/settings/workspace-security-view.tsx";
import type { WorkspaceSecurityState } from "#components/settings/workspace-security-view.tsx";

import { ignore, render } from "./render.tsx";

const handlers = {
  onCancel: ignore,
  onConfirm: ignore,
  onRequire: ignore,
  onStop: ignore,
};

const owner: WorkspaceSecurityState = {
  accountLink: <span data-href="/app/account">Account</span>,
  confirming: false,
  error: null,
  mayChange: true,
  ownEnabled: true,
  pending: false,
  required: false,
  without: ["Ben"],
};

const view = async (state: Partial<WorkspaceSecurityState>) =>
  await render(
    "en",
    <WorkspaceSecurityView {...owner} {...state} {...handlers} />
  );

describe(WorkspaceSecurityView, () => {
  it("lets an owner with it on require it, saying who does not have it", async () => {
    const html = await view({});

    expect(html).toContain("Two-step verification is not required.");
    expect(html).toContain("1 member does not have it on.");
    expect(html).toContain("Require it");
  });

  it("sends an owner without it to their account first", async () => {
    const html = await view({ ownEnabled: false });

    expect(html).toContain("Turn it on for your own account first.");
    expect(html).toContain('data-href="/app/account"');
    expect(html).not.toContain("Require it");
  });

  it("only says what is required to anyone but an owner", async () => {
    const html = await view({
      mayChange: false,
      required: true,
      without: null,
    });

    expect(html).toContain(
      "Two-step verification is required of every member."
    );
    expect(html).toContain("Only an owner, signed in themselves");
    expect(html).not.toContain("Stop requiring it");
  });

  it("lets an owner stop requiring it", async () => {
    await expect(view({ required: true })).resolves.toContain(
      "Stop requiring it"
    );
  });
});

describe(RequireConfirmation, () => {
  it("names who loses access, and says keys keep working", async () => {
    await expect(
      render("en", <RequireConfirmation without={["Ben", "Cleo"]} />)
    ).resolves.toBe(
      "2 members do not have it on and will lose access until they turn it on: Ben, Cleo. API keys keep working."
    );
  });

  it("says nobody does when every member has it on, in French too", async () => {
    await expect(
      render("fr", <RequireConfirmation without={[]} />)
    ).resolves.toContain("personne ne perd l’accès");
  });
});

const members = [
  {
    id: "member-1",
    role: "owner",
    user: { email: "ana@example.test", name: "Ana" },
    userId: "ana",
  },
  {
    id: "member-2",
    role: "editor",
    user: { email: "ben@example.test", name: "Ben" },
    userId: "ben",
  },
];

const manager = {
  mayRemove: true,
  mayUpdate: true,
  role: "owner",
  userId: "ana",
};

describe("the members list's two-step verification", () => {
  it("shows to a manager whether each member has it on", async () => {
    const html = await render(
      "en",
      <MembersView
        manager={manager}
        members={members}
        twoStep={
          new Map([
            ["ana", true],
            ["ben", false],
          ])
        }
        workspaceId="workspace"
        onChanged={ignore}
      />
    );

    expect(html).toContain("Two-step verification: On");
    expect(html).toContain("Two-step verification: Off");
  });

  it("shows nothing of it to anyone else", async () => {
    await expect(
      render(
        "en",
        <MembersView
          manager={{ ...manager, mayRemove: false, mayUpdate: false }}
          members={members}
          workspaceId="workspace"
          onChanged={ignore}
        />
      )
    ).resolves.not.toContain("Two-step verification");
  });
});
