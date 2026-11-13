import { Option } from "effect";
import { getTranslations } from "next-intl/server";
import { Button } from "peal-ui/components/button";

import { currentUserOrNone } from "#auth/session.ts";
import { AccountMenuView } from "#components/account-menu-view.tsx";
import { NotificationBell } from "#components/notices/notification-bell.tsx";
import { Link } from "#i18n/navigation.ts";

// The header's account corner: the signed-in user, read from GET /api/me
// while the page renders, with their notifications' bell, or a way to sign
// in, also when that read fails.
export const AccountMenu = async () => {
  const me = await currentUserOrNone();
  const t = await getTranslations("UserMenu");

  return Option.match(me, {
    onNone: () => (
      <Button variant="ghost" size="sm" render={<Link href="/sign-in" />}>
        {t("signIn")}
      </Button>
    ),
    onSome: ({ user }) => (
      <>
        <NotificationBell />
        <AccountMenuView name={user.name} email={user.email} />
      </>
    ),
  });
};
