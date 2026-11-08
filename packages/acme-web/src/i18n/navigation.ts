import { createNavigation } from "next-intl/navigation";

import { routing } from "#i18n/routing.ts";

// Next's navigation APIs, aware of the locale prefix.
export const { Link, getPathname, redirect, usePathname, useRouter } =
  createNavigation(routing);
