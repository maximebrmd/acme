"use client";

import { useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";
import { useTransition } from "react";
import { toast } from "sonner";

import { authClient } from "#auth/client.ts";
import { useRouter } from "#i18n/navigation.ts";

// Ends the impersonation: Better Auth deletes its session and signs the
// staff member's own back in, then the console opens the account's page.
export const StopImpersonating = ({ userId }: { readonly userId: string }) => {
  const t = useTranslations("Impersonation");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStop = () => {
    startTransition(async () => {
      const result = await authClient.admin.stopImpersonating();

      if (result.error === null) {
        router.push(`/admin/users/${userId}`);
        router.refresh();
      } else {
        toast.error(t("stopFailed"));
      }
    });
  };

  return (
    <Button
      size="sm"
      disabled={isPending}
      focusableWhenDisabled
      onClick={handleStop}
    >
      {isPending ? t("stopping") : t("stop")}
    </Button>
  );
};
