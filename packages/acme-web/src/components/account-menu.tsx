import { Button } from "acme-ui/components/button";
import { Option } from "effect";
import { getTranslations } from "next-intl/server";

import { currentUser } from "#auth/session.ts";
import { AccountMenuView } from "#components/account-menu-view.tsx";
import { Link } from "#i18n/navigation.ts";

// The header's account corner: the signed-in user, read from GET /api/me
// while the page renders, or a way to sign in.
export const AccountMenu = async () => {
  const me = await currentUser();
  const t = await getTranslations("UserMenu");

  return Option.match(me, {
    onNone: () => (
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/sign-in" />}
        nativeButton={false}
      >
        {t("signIn")}
      </Button>
    ),
    onSome: ({ user }) => (
      <AccountMenuView name={user.name} email={user.email} />
    ),
  });
};
