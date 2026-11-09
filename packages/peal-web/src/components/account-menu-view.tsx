"use client";

import { CircleUserIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "peal-ui/components/dropdown-menu";
import { useTransition } from "react";
import { toast } from "sonner";

import { authClient } from "#auth/client.ts";
import { useRouter } from "#i18n/navigation.ts";

interface AccountMenuViewProps {
  readonly email: string;
  readonly name: string;
}

// The signed-in user's menu: who they are, their workspaces, their account
// settings, and signing out, after which the page renders again without the
// session.
export const AccountMenuView = ({ email, name }: AccountMenuViewProps) => {
  const t = useTranslations("UserMenu");
  const account = useTranslations("AccountSettings");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Asks Better Auth for the session as pages open and the tab regains
  // focus. That is what extends the session, and renews the copy cached in
  // a cookie: GET /api/me, which pages read, leaves both as they are.
  authClient.useSession();

  const handleSignOut = () => {
    startTransition(async () => {
      const result = await authClient.signOut();

      if (result.error === null) {
        router.push("/");
        router.refresh();
      } else {
        toast.error(t("signOutFailed"));
      }
    });
  };

  const handleOpenApp = () => {
    router.push("/app");
  };

  const handleOpenAccount = () => {
    router.push("/app/account");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            focusableWhenDisabled
          />
        }
        aria-label={t("trigger", { name })}
      >
        <CircleUserIcon data-icon="inline-start" aria-hidden />
        {name}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("signedInAs", { email })}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleOpenApp}>{t("app")}</DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenAccount}>
          {account("menu")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
