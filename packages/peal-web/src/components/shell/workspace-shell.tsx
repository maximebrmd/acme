"use client";

import { MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Permission } from "peal-contract";
import { Button } from "peal-ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "peal-ui/components/sheet";
import { useState } from "react";
import type { ReactNode } from "react";

import { SidebarView } from "#components/shell/sidebar-view.tsx";
import type { LinkComponent } from "#components/shell/sidebar-view.tsx";
import { TopBarView } from "#components/shell/top-bar-view.tsx";
import { Link, usePathname } from "#i18n/navigation.ts";
import { navigationOf } from "#shell/navigation.ts";

const AppLink: LinkComponent = ({ children, ...props }) => (
  <Link {...props}>{children}</Link>
);

/**
 * The frame of a workspace's pages: the sidebar beside them (in a dialog
 * on a narrow screen), the top bar above, and the page's foot below.
 */
export const WorkspaceShell = ({
  actions,
  children,
  docsUrl,
  footer,
  permissions,
  supportUrl,
  workspaceId,
  workspaces,
}: {
  readonly actions: ReactNode;
  readonly children: ReactNode;
  readonly docsUrl: string | null;
  /** What every page ends with: the contract functions. */
  readonly footer: ReactNode;
  readonly permissions: readonly Permission[];
  readonly supportUrl: string | null;
  readonly workspaceId: string;
  readonly workspaces: readonly {
    readonly id: string;
    readonly name: string;
  }[];
}) => {
  const t = useTranslations("WorkspaceShell");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = navigationOf({ pathname, permissions, workspaceId });

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <div className="bg-background flex min-h-svh">
      <SidebarView
        className="sticky top-0 hidden h-svh shrink-0 border-r md:flex"
        link={AppLink}
        navigation={navigation}
        workspaceId={workspaceId}
        workspaces={workspaces}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBarView
          actions={actions}
          breadcrumb={navigation.breadcrumb}
          docsUrl={docsUrl}
          supportUrl={supportUrl}
          menu={
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="md:hidden"
                    aria-label={t("openMenu")}
                  />
                }
              >
                <MenuIcon aria-hidden />
              </SheetTrigger>
              {/* Closed by Escape or a tap beside it: a corner button would
                  sit on the mode switch. */}
              <SheetContent side="left">
                <SheetTitle className="sr-only">{t("label")}</SheetTitle>
                <SidebarView
                  className="w-full"
                  link={AppLink}
                  navigation={navigation}
                  onNavigate={closeMenu}
                  workspaceId={workspaceId}
                  workspaces={workspaces}
                />
              </SheetContent>
            </Sheet>
          }
        />
        <main className="flex-1 px-4 py-8 md:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <footer className="text-muted-foreground border-t px-4 py-6 text-sm md:px-8">
          {footer}
        </footer>
      </div>
    </div>
  );
};
