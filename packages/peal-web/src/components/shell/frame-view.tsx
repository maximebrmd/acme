"use client";

import { MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "peal-ui/components/sheet";
import { createContext, use, useCallback, useState } from "react";
import type { ReactNode } from "react";

import { TopBarView } from "#components/shell/top-bar-view.tsx";

// What a sidebar's link calls once followed: it closes the sheet that
// holds the sidebar on a phone, and does nothing beside the page.
const CloseMenu = createContext<() => void>(() => {
  // Beside the page, there is no sheet to close.
});

/** What to call when a sidebar's link is followed. */
export const useCloseMenu = (): (() => void) => use(CloseMenu);

/**
 * The signed-in app's frame (DESIGN.md, "The frame"): a sidebar beside the
 * page (in a sheet on a narrow screen), the top bar above it, and the
 * page's foot below. The sidebar is drawn twice, beside the page and in
 * the sheet; its links close the sheet through `useCloseMenu`.
 */
export const FrameView = ({
  actions,
  breadcrumb,
  children,
  docsUrl,
  footer,
  label,
  sidebar,
  supportUrl,
}: {
  readonly actions: ReactNode;
  readonly breadcrumb: {
    readonly section: string | null;
    readonly page: string | null;
  };
  readonly children: ReactNode;
  readonly docsUrl: string | null;
  /** What every page ends with: the contract functions. */
  readonly footer: ReactNode;
  /** The sidebar's name, for the sheet that holds it on a phone. */
  readonly label: string;
  readonly sidebar: ReactNode;
  readonly supportUrl: string | null;
}) => {
  const t = useTranslations("WorkspaceShell");
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <div className="bg-background flex min-h-svh">
      <div className="sticky top-0 hidden h-svh shrink-0 border-r md:flex">
        {sidebar}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBarView
          actions={actions}
          breadcrumb={breadcrumb}
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
                  sit on the sidebar's head. */}
              <SheetContent side="left">
                <SheetTitle className="sr-only">{label}</SheetTitle>
                <CloseMenu value={closeMenu}>{sidebar}</CloseMenu>
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
