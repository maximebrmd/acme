import { BookOpenIcon, LifeBuoyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";
import type { ReactNode } from "react";

/**
 * The bar above the signed-in app's pages (DESIGN.md, "The frame"): the
 * open section and page, then the documentation and support, when the
 * server names them, and the account's corner.
 */
export const TopBarView = ({
  actions,
  breadcrumb,
  docsUrl,
  menu,
  supportUrl,
}: {
  /** The notifications and the account menu. */
  readonly actions: ReactNode;
  /** The open section's and page's names, either missing on some pages. */
  readonly breadcrumb: {
    readonly section: string | null;
    readonly page: string | null;
  };
  readonly docsUrl: string | null;
  /** The button that opens the sidebar on a narrow screen. */
  readonly menu: ReactNode;
  readonly supportUrl: string | null;
}) => {
  const t = useTranslations("WorkspaceShell");

  return (
    <header className="bg-background flex h-14 shrink-0 items-center gap-2 border-b px-3 md:px-4">
      {menu}
      <nav aria-label={t("breadcrumb")} className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          {breadcrumb.section === null ? null : (
            <li className="text-muted-foreground flex items-center gap-1.5">
              {breadcrumb.section}
              <span aria-hidden className="text-muted-foreground/60">
                /
              </span>
            </li>
          )}
          {breadcrumb.page === null ? null : (
            <li aria-current="page" className="truncate font-medium">
              {breadcrumb.page}
            </li>
          )}
        </ol>
      </nav>
      {docsUrl === null ? null : (
        <Button
          variant="outline"
          className="hidden sm:inline-flex"
          render={
            <a
              href={docsUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t("docs")}
            />
          }
          nativeButton={false}
        >
          <BookOpenIcon aria-hidden />
          {t("docs")}
        </Button>
      )}
      {supportUrl === null ? null : (
        <Button
          variant="outline"
          className="hidden sm:inline-flex"
          render={
            <a
              href={supportUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t("support")}
            />
          }
          nativeButton={false}
        >
          <LifeBuoyIcon aria-hidden />
          {t("support")}
        </Button>
      )}
      <div className="flex items-center gap-1">{actions}</div>
    </header>
  );
};
