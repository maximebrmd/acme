import { Effect, Option } from "effect";
import { Suspense } from "react";

import { currentUserOrNone } from "#auth/session.ts";
import { contactUrlConfig } from "#billing/terms.ts";
import { AccountMenu } from "#components/account-menu.tsx";
import { PlainFrame } from "#components/app-shell.tsx";
import { ContractLinks } from "#components/contract/contract-links.tsx";
import { LanguageSwitcher } from "#components/language-switcher.tsx";
import { PersonalShell } from "#components/shell/personal-shell.tsx";
import { docsUrlConfig } from "#shell/docs-url.ts";

// Around the person's own pages (the workspaces, the agenda, the report,
// the notices, the account): their frame, with their workspaces in the
// sidebar. Someone signed out gets the app's plain frame, and each page
// sends them to sign in.
const PersonalLayout = async ({ children }: LayoutProps<"/[locale]/app">) => {
  const me = await currentUserOrNone();

  if (Option.isNone(me)) {
    return <PlainFrame>{children}</PlainFrame>;
  }

  const [docsUrl, supportUrl] = await Promise.all([
    Effect.runPromise(docsUrlConfig),
    Effect.runPromise(contactUrlConfig),
  ]);

  return (
    <PersonalShell
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
      supportUrl={supportUrl}
      workspaces={me.value.workspaces.map(({ id, name }) => ({ id, name }))}
    >
      {children}
    </PersonalShell>
  );
};

export default PersonalLayout;
