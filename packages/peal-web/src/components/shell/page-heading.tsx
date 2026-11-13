"use client";

import { useTranslations } from "next-intl";

import { usePathname } from "#i18n/navigation.ts";
import { navigationOf } from "#shell/navigation.ts";

// The open page's name as a heading, for pages that have none of their own
// (the workspace's settings): the sidebar's name for it.
export const PageHeading = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceShell");
  const pathname = usePathname();

  const { page } = navigationOf({
    pathname,
    permissions: [],
    workspaceId,
  }).breadcrumb;

  return page === null ? null : (
    <h1 className="text-2xl font-semibold tracking-tight">
      {t(`pages.${page}`)}
    </h1>
  );
};
