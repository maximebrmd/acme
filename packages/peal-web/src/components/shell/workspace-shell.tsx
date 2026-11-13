"use client";

import { useTranslations } from "next-intl";
import type { Permission } from "peal-contract";
import type { ReactNode } from "react";

import { FrameView } from "#components/shell/frame-view.tsx";
import { SidebarView } from "#components/shell/sidebar-view.tsx";
import type { LinkComponent } from "#components/shell/sidebar-view.tsx";
import { Link, usePathname } from "#i18n/navigation.ts";
import { navigationOf } from "#shell/navigation.ts";

export const AppLink: LinkComponent = ({ children, ...props }) => (
  <Link {...props}>{children}</Link>
);

/**
 * The frame of a workspace's pages: its sidebar (Studio and Console), the
 * top bar naming the open page, and the page's foot.
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
  const navigation = navigationOf({ pathname, permissions, workspaceId });
  const { page, section } = navigation.breadcrumb;

  return (
    <FrameView
      actions={actions}
      breadcrumb={{
        page: page === null ? null : t(`pages.${page}`),
        section: section === null ? null : t(`sections.${section}`),
      }}
      docsUrl={docsUrl}
      footer={footer}
      label={t("label")}
      supportUrl={supportUrl}
      sidebar={
        <SidebarView
          link={AppLink}
          navigation={navigation}
          workspaceId={workspaceId}
          workspaces={workspaces}
        />
      }
    >
      {children}
    </FrameView>
  );
};
