"use client";

import { Alert, AlertDescription } from "acme-ui/components/alert";
import { Button } from "acme-ui/components/button";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { authClient } from "#auth/client.ts";
import { useRouter } from "#i18n/navigation.ts";

// Joins the workspace with the role the invitation offers.
export const AcceptInvitation = ({
  invitationId,
}: {
  readonly invitationId: string;
}) => {
  const t = useTranslations("InvitationPage");
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      const result = await authClient.organization.acceptInvitation({
        invitationId,
      });

      if (result.error === null) {
        router.push("/app");
        router.refresh();
      } else {
        setFailed(true);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {failed ? (
        <Alert variant="destructive">
          <AlertDescription>{t("failed")}</AlertDescription>
        </Alert>
      ) : null}
      <Button disabled={isPending} focusableWhenDisabled onClick={handleAccept}>
        {isPending ? t("accepting") : t("accept")}
      </Button>
    </div>
  );
};
