"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "#i18n/navigation.ts";

const sections = [
  { href: "/admin", key: "system" },
  { href: "/admin/users", key: "users" },
  { href: "/admin/workspaces", key: "workspaces" },
  { href: "/admin/contract-requests", key: "requests" },
  { href: "/admin/audit", key: "audit" },
] as const;

// Whether a section holds the page open: the system page alone, the
// others with the pages below them.
const isOpen = (href: string, pathname: string): boolean =>
  href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

// The staff console's sections, the one open marked as current.
export const StaffNav = () => {
  const t = useTranslations("Staff.nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="border-b">
      <ul className="flex flex-wrap gap-6 text-sm">
        {sections.map(({ href, key }) => (
          <li key={key}>
            <Link
              href={href}
              aria-current={isOpen(href, pathname) ? "page" : undefined}
              className="text-muted-foreground hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:text-foreground -mb-px inline-block border-b-2 border-transparent pb-2"
            >
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
