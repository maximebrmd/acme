import { Effect, Option } from "effect";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "peal-ui/components/button";
import { Suspense } from "react";

import { currentUserOrNone } from "#auth/session.ts";
import { standingOfWorkspace } from "#billing/standing.ts";
import { contactUrlConfig, termsUrlConfig } from "#billing/terms.ts";
import { AccountMenu } from "#components/account-menu.tsx";
import { PlainFrame } from "#components/app-shell.tsx";
import { PlanGate } from "#components/billing/plan-gate.tsx";
import { UpgradePrompts } from "#components/billing/upgrade-prompts.tsx";
import { ContractLinks } from "#components/contract/contract-links.tsx";
import { LanguageSwitcher } from "#components/language-switcher.tsx";
import { WorkspaceShell } from "#components/shell/workspace-shell.tsx";
import { TwoStepRefusalWatch } from "#components/two-step/refusal-watch.tsx";
import { TwoStepRequiredNotice } from "#components/two-step/required-notice.tsx";
import { Link } from "#i18n/navigation.ts";
import { docsUrlConfig } from "#shell/docs-url.ts";

// Around every page of a workspace: its frame (the sidebar, the top bar and
// the contract functions at the foot), the notice a member whose account lacks
// the two-step verification the workspace requires sees instead of any of
// it, the upgrade dialog, which opens where the plan refuses something, and
// the gate that shows the over-plan screen instead of the page while the
// workspace holds more than its plan allows.
// Each page still reads the user and decides what it shows; someone who is
// not a member gets the page's own answer, in the app's plain frame.
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
    return <PlainFrame>{await children}</PlainFrame>;
  }

  if (workspace.value.twoStepRequired && !me.value.user.twoStepEnabled) {
    const t = await getTranslations("TwoStep");

    return (
      <PlainFrame>
        <TwoStepRequiredNotice
          action={
            <Link href="/app/account" className={buttonVariants()}>
              {t("goToAccount")}
            </Link>
          }
        />
      </PlainFrame>
    );
  }

  const [standing, termsUrl, contactUrl, docsUrl] = await Promise.all([
    standingOfWorkspace(workspaceId),
    Effect.runPromise(termsUrlConfig),
    Effect.runPromise(contactUrlConfig),
    Effect.runPromise(docsUrlConfig),
  ]);

  return (
    <WorkspaceShell
      actions={
        <>
          <LanguageSwitcher />
          <Suspense fallback={null}>
            <AccountMenu />
          </Suspense>
        </>
      }
      docsUrl={docsUrl}
      footer={
        <Suspense fallback={null}>
          <ContractLinks />
        </Suspense>
      }
      permissions={workspace.value.permissions}
      supportUrl={contactUrl}
      workspaceId={workspaceId}
      workspaces={me.value.workspaces.map(({ id, name }) => ({ id, name }))}
    >
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
    </WorkspaceShell>
  );
};

export default WorkspaceLayout;
