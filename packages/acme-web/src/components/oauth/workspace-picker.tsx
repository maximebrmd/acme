"use client";

import { Alert, AlertDescription } from "acme-ui/components/alert";
import { Badge } from "acme-ui/components/badge";
import { Button } from "acme-ui/components/button";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { authClient } from "#auth/client.ts";
import { isOAuthRedirect } from "#auth/oauth-redirect.ts";

interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly role: string;
}

// The workspace picker of an OAuth authorization: the workspace picked
// becomes the session's active one, which Better Auth binds the client's
// tokens to, then the authorization goes on to the consent page.
export const WorkspacePicker = ({
  workspaces,
}: {
  readonly workspaces: readonly Workspace[];
}) => {
  const t = useTranslations("OAuth.workspace");
  const oauth = useTranslations("OAuth");
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handlePick = (organizationId: string) => () => {
    startTransition(async () => {
      const picked = await authClient.organization.setActive({
        organizationId,
      });

      if (picked.error !== null) {
        setFailed(true);

        return;
      }

      // Better Auth answers with the next page, which its client opens.
      const continued = await authClient.oauth2.continue({ postLogin: true });

      setFailed(continued.error !== null || !isOAuthRedirect(continued.data));
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {failed ? (
        <Alert variant="destructive">
          <AlertDescription>{oauth("failed")}</AlertDescription>
        </Alert>
      ) : null}
      <ul className="flex flex-col gap-2">
        {workspaces.map((workspace) => (
          <li key={workspace.id} className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={isPending}
              focusableWhenDisabled
              onClick={handlePick(workspace.id)}
            >
              {isPending ? t("picking") : t("use", { name: workspace.name })}
            </Button>
            <Badge variant="outline">
              {oauth("role", { role: workspace.role })}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
};
