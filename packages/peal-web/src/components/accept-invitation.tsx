"use client";

import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { useState, useTransition } from "react";

import { authClient } from "#auth/client.ts";
import { authErrorKey } from "#auth/errors.ts";
import { useRouter } from "#i18n/navigation.ts";

// Joins the workspace with the role the invitation offers.
export const AcceptInvitation = ({
  invitationId,
}: {
  readonly invitationId: string;
}) => {
  const t = useTranslations("InvitationPage");
  const errors = useTranslations("Auth.errors");
  const router = useRouter();
  // Why joining failed: the plan has no room, or the invitation is not valid.
  const [failed, setFailed] = useState<"invalid" | "planLimit" | null>(null);
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
        setFailed(
          authErrorKey(result.error) === "MEMBER_LIMIT_REACHED"
            ? "planLimit"
            : "invalid"
        );
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {failed === null ? null : (
        <Alert variant="destructive">
          <AlertDescription>
            {failed === "planLimit"
              ? errors("MEMBER_LIMIT_REACHED")
              : t("failed")}
          </AlertDescription>
        </Alert>
      )}
      <Button disabled={isPending} focusableWhenDisabled onClick={handleAccept}>
        {isPending ? t("accepting") : t("accept")}
      </Button>
    </div>
  );
};
