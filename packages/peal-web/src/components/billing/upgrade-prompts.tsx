import { Effect, Option } from "effect";
import type { ReactNode } from "react";

import { currentUserOrNone } from "#auth/session.ts";
import { contactUrlConfig, termsUrlConfig } from "#billing/terms.ts";
import { UpgradePromptProvider } from "#components/billing/upgrade-prompt.tsx";

/**
 * For Server Components: the upgrade dialog around `children`, for the
 * signed-in user's workspaces, with the operator's links read at request
 * time. `current` is the workspace the pages inside are about, if any.
 * Without a signed-in user, the children alone.
 */
export const UpgradePrompts = async ({
  children,
  current,
}: {
  readonly children: ReactNode;
  readonly current: string | null;
}) => {
  const me = await currentUserOrNone();

  if (Option.isNone(me)) {
    return await children;
  }

  const [termsUrl, contactUrl] = await Promise.all([
    Effect.runPromise(termsUrlConfig),
    Effect.runPromise(contactUrlConfig),
  ]);

  return (
    <UpgradePromptProvider
      contactUrl={contactUrl}
      current={current}
      termsUrl={termsUrl}
      workspaces={me.value.workspaces.map(({ id, name, permissions }) => ({
        canManage: permissions.includes("billing:manage"),
        id,
        name,
      }))}
    >
      {children}
    </UpgradePromptProvider>
  );
};
