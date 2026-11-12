import { Effect, Option } from "effect";
import { getTranslations } from "next-intl/server";
import { Button } from "peal-ui/components/button";

import { currentUserOrNone } from "#auth/session.ts";
import { standingOfWorkspace } from "#billing/standing.ts";
import { contactUrlConfig, termsUrlConfig } from "#billing/terms.ts";
import { PlanGate } from "#components/billing/plan-gate.tsx";
import { UpgradePrompts } from "#components/billing/upgrade-prompts.tsx";
import { TwoStepRefusalWatch } from "#components/two-step/refusal-watch.tsx";
import { TwoStepRequiredNotice } from "#components/two-step/required-notice.tsx";
import { Link } from "#i18n/navigation.ts";

// Around every page of a workspace: the notice a member whose account lacks
// the two-step verification the workspace requires sees instead of any of
// it, the upgrade dialog, which opens where the plan refuses something, and
// the gate that shows the over-plan screen instead of the page while the
// workspace holds more than its plan allows.
// Each page still reads the user and decides what it shows; someone who is
// not a member gets the page's own answer.
const WorkspaceLayout = async ({
  children,
  params,
}: LayoutProps<"/[locale]/app/[workspaceId]">) => {
  const { workspaceId } = await params;
  const me = await currentUserOrNone();

  const workspace = me.pipe(
    Option.flatMapNullishOr(({ workspaces }) =>
      workspaces.find(({ id }) => id === workspaceId)
    )
  );

  if (Option.isNone(me) || Option.isNone(workspace)) {
    return await children;
  }

  if (workspace.value.twoStepRequired && !me.value.user.twoStepEnabled) {
    const t = await getTranslations("TwoStep");

    return (
      <TwoStepRequiredNotice
        action={
          <Button render={<Link href="/app/account" />} nativeButton={false}>
            {t("goToAccount")}
          </Button>
        }
      />
    );
  }

  const [standing, termsUrl, contactUrl] = await Promise.all([
    standingOfWorkspace(workspaceId),
    Effect.runPromise(termsUrlConfig),
    Effect.runPromise(contactUrlConfig),
  ]);

  return (
    <UpgradePrompts current={workspaceId}>
      <TwoStepRefusalWatch />
      <PlanGate
        contactUrl={contactUrl}
        self={me.value.user.id}
        standing={Option.getOrNull(standing)}
        termsUrl={termsUrl}
        workspace={{
          canManage: workspace.value.permissions.includes("billing:manage"),
          id: workspace.value.id,
          name: workspace.value.name,
        }}
      >
        {children}
      </PlanGate>
    </UpgradePrompts>
  );
};

export default WorkspaceLayout;
