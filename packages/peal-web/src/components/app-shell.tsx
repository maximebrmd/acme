import { useTranslations } from "next-intl";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { AccountMenu } from "#components/account-menu.tsx";
import { ContractLinks } from "#components/contract/contract-links.tsx";
import { ImpersonationBanner } from "#components/impersonation-banner.tsx";
import { LanguageSwitcher } from "#components/language-switcher.tsx";
import { ShellFrame } from "#components/shell-frame.tsx";
import { Link } from "#i18n/navigation.ts";

// The frame around every page: the impersonation banner while staff act as
// someone, a header with the product name, the language switcher and the
// account menu, the page itself, then a footer with the functions to
// cancel a contract and to withdraw from one. A connect link's pages, whose
// visitors have no Peal account, get a plain footer in their place
// (ShellFrame).
export const AppShell = ({ children }: { readonly children: ReactNode }) => {
  const t = useTranslations("AppShell");

  return (
    <div className="flex min-h-svh flex-col">
      <Suspense fallback={null}>
        <ImpersonationBanner />
      </Suspense>
      <ShellFrame
        header={
          <header className="border-b">
            <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
              <Link href="/" className="font-semibold tracking-tight">
                {t("productName")}
              </Link>
              <div className="flex items-center gap-1">
                <LanguageSwitcher />
                <Suspense fallback={null}>
                  <AccountMenu />
                </Suspense>
              </div>
            </div>
          </header>
        }
        footer={
          <footer className="border-t">
            <div className="text-muted-foreground mx-auto w-full max-w-5xl px-4 py-6 text-sm">
              <Suspense fallback={null}>
                <ContractLinks />
              </Suspense>
            </div>
          </footer>
        }
        hosted={
          <footer className="border-t">
            <div className="text-muted-foreground mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 text-sm">
              <span>{t("hostedBy", { product: t("productName") })}</span>
              <LanguageSwitcher />
            </div>
          </footer>
        }
      >
        {children}
      </ShellFrame>
    </div>
  );
};
