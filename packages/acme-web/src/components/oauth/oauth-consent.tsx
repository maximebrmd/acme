"use client";

import { Alert, AlertDescription } from "acme-ui/components/alert";
import { Button } from "acme-ui/components/button";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { authClient } from "#auth/client.ts";
import { isOAuthRedirect } from "#auth/oauth-redirect.ts";
import { ScopeList } from "#components/oauth/scope-list.tsx";

// The consent page of an OAuth authorization: what the client asks to do,
// in which workspace, and where the browser goes next. Allowing or denying
// sends the browser back to the client, which Better Auth's client does.
export const OAuthConsent = ({
  redirectHost,
  scopes,
}: {
  readonly redirectHost: string | null;
  readonly scopes: readonly string[];
}) => {
  const t = useTranslations("OAuth.consent");
  const oauth = useTranslations("OAuth");
  // The workspace picked a moment ago, which the client's tokens are bound
  // to.
  const workspace = authClient.useActiveOrganization();
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAnswer = (accept: boolean) => () => {
    startTransition(async () => {
      const answered = await authClient.oauth2.consent({ accept });

      setFailed(answered.error !== null || !isOAuthRedirect(answered.data));
    });
  };

  const workspaceName = workspace.data?.name;

  return (
    <div className="flex flex-col gap-4">
      {failed ? (
        <Alert variant="destructive">
          <AlertDescription>{oauth("failed")}</AlertDescription>
        </Alert>
      ) : null}
      <p className="text-sm">
        {workspaceName === undefined
          ? t("workspaceUnknown")
          : t("workspace", { workspace: workspaceName })}
      </p>
      <ScopeList scopes={scopes} />
      {redirectHost === null ? null : (
        <p className="text-muted-foreground text-sm">
          {t("redirect", { host: redirectHost })}
        </p>
      )}
      <Alert>
        <AlertDescription>{t("unverified")}</AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button
          disabled={isPending}
          focusableWhenDisabled
          onClick={handleAnswer(true)}
        >
          {isPending ? t("allowing") : t("allow")}
        </Button>
        <Button
          variant="outline"
          disabled={isPending}
          focusableWhenDisabled
          onClick={handleAnswer(false)}
        >
          {t("deny")}
        </Button>
      </div>
    </div>
  );
};
