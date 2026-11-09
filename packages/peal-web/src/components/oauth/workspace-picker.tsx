"use client";

import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { authClient, workspaceClient } from "#auth/client.ts";
import { isOAuthRedirect } from "#auth/oauth-redirect.ts";

interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly role: string;
}

interface WorkspacePickerViewProps {
  readonly failed: boolean;
  readonly onPick: (workspaceId: string) => () => void;
  /** The workspace picked, while the authorization goes on with it. */
  readonly picking: string | null;
  readonly workspaces: readonly Workspace[];
}

// The picker's buttons. While one workspace is being picked, every button
// waits, and only its own says so: the others keep the names of their
// workspaces, so each still tells what it would pick.
export const WorkspacePickerView = ({
  failed,
  onPick,
  picking,
  workspaces,
}: WorkspacePickerViewProps) => {
  const t = useTranslations("OAuth.workspace");
  const oauth = useTranslations("OAuth");

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
              disabled={picking !== null}
              focusableWhenDisabled
              onClick={onPick(workspace.id)}
            >
              {picking === workspace.id
                ? t("picking")
                : t("use", { name: workspace.name })}
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

// The workspace picker of an OAuth authorization: the workspace picked
// becomes the session's active one, which Better Auth binds the client's
// tokens to, then the authorization goes on to the consent page.
export const WorkspacePicker = ({
  workspaces,
}: {
  readonly workspaces: readonly Workspace[];
}) => {
  const [failed, setFailed] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePick = (organizationId: string) => () => {
    setChosen(organizationId);
    startTransition(async () => {
      const picked = await workspaceClient.organization.setActive({
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
    <WorkspacePickerView
      failed={failed}
      onPick={handlePick}
      picking={isPending ? chosen : null}
      workspaces={workspaces}
    />
  );
};
