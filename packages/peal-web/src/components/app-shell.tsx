import { useTranslations } from "next-intl";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { AccountMenu } from "#components/account-menu.tsx";
import { ImpersonationBanner } from "#components/impersonation-banner.tsx";
import { LanguageSwitcher } from "#components/language-switcher.tsx";
import { Link } from "#i18n/navigation.ts";

// The frame around every page: the impersonation banner while staff act as
// someone, a header with the product name, the language switcher and the
// account menu, then the page itself.
export const AppShell = ({ children }: { readonly children: ReactNode }) => {
  const t = useTranslations("AppShell");

  return (
    <div className="flex min-h-svh flex-col">
      <Suspense fallback={null}>
        <ImpersonationBanner />
      </Suspense>
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        {children}
      </main>
    </div>
  );
};
