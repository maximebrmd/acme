"use client";

import { Option } from "effect";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import { useId, useState, useTransition } from "react";

import { authClient } from "#auth/client.ts";
import {
  adsScope,
  consentAnswer,
  mayLeaveAdsOut,
  publishScope,
  withoutPublishing,
} from "#auth/consent-scopes.ts";
import type { WithoutPublishing } from "#auth/consent-scopes.ts";
import { isOAuthRedirect } from "#auth/oauth-redirect.ts";
import { ScopeList } from "#components/oauth/scope-list.tsx";

// Publishing, which the person may leave out: ticked, the application
// schedules and publishes; unticked, it keeps the rest of what it asked.
const PublishingChoice = ({
  checked,
  disabled,
  onChange,
  rest,
}: {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly rest: WithoutPublishing;
}) => {
  const t = useTranslations("OAuth.consent");
  const id = useId();
  const hintId = useId();

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        aria-describedby={hintId}
        onCheckedChange={onChange}
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{t("publish")}</Label>
        <p id={hintId} className="text-muted-foreground text-xs">
          {t("publishHint", { rest })}
        </p>
      </div>
    </div>
  );
};

// Ads, which the person may leave out: ticked, the application connects
// ad accounts and, when it may publish too, spends on ads within the
// ceiling an owner set; unticked, it does nothing with ads.
const AdsChoice = ({
  checked,
  disabled,
  onChange,
}: {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onChange: (checked: boolean) => void;
}) => {
  const t = useTranslations("OAuth.consent");
  const id = useId();
  const hintId = useId();

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        aria-describedby={hintId}
        onCheckedChange={onChange}
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{t("ads")}</Label>
        <p id={hintId} className="text-muted-foreground text-xs">
          {t("adsHint")}
        </p>
      </div>
    </div>
  );
};

interface OAuthConsentViewProps {
  /** Whether the application may use ads, if it asked to. */
  readonly allowAds: boolean;
  /** Whether the application may schedule and publish, if it asked to. */
  readonly allowPublishing: boolean;
  readonly failed: boolean;
  readonly onAdsChange: (allowed: boolean) => void;
  readonly onAllow: () => void;
  readonly onDeny: () => void;
  readonly onPublishingChange: (allowed: boolean) => void;
  /** Whether an answer is on its way. */
  readonly pending: boolean;
  readonly redirectHost: string | null;
  readonly scopes: readonly string[];
  /** The workspace the application acts in, once known. */
  readonly workspaceName: string | undefined;
}

/**
 * What an application asks to do, in which workspace, and where the
 * browser goes next. Publishing and ads each have a line of their own,
 * with a box the person may untick to allow the rest without it.
 */
export const OAuthConsentView = ({
  allowAds,
  allowPublishing,
  failed,
  onAdsChange,
  onAllow,
  onDeny,
  onPublishingChange,
  pending,
  redirectHost,
  scopes,
  workspaceName,
}: OAuthConsentViewProps) => {
  const t = useTranslations("OAuth.consent");
  const oauth = useTranslations("OAuth");
  // What is left without publishing; null when there is nothing to choose,
  // and every scope is a line of the list.
  const kept = Option.getOrNull(withoutPublishing(scopes));
  const adsChoice = mayLeaveAdsOut(scopes);

  // The scopes that have a box are its line alone, not one of the list.
  const listed = scopes.filter(
    (scope) =>
      !(kept !== null && scope === publishScope) &&
      !(adsChoice && scope === adsScope)
  );

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
      <ScopeList scopes={listed} />
      {kept === null ? null : (
        <PublishingChoice
          checked={allowPublishing}
          disabled={pending}
          rest={kept}
          onChange={onPublishingChange}
        />
      )}
      {adsChoice ? (
        <AdsChoice
          checked={allowAds}
          disabled={pending}
          onChange={onAdsChange}
        />
      ) : null}
      {redirectHost === null ? null : (
        <p className="text-muted-foreground text-sm">
          {t("redirect", { host: redirectHost })}
        </p>
      )}
      <Alert>
        <AlertDescription>{t("unverified")}</AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button disabled={pending} focusableWhenDisabled onClick={onAllow}>
          {pending ? t("allowing") : t("allow")}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          focusableWhenDisabled
          onClick={onDeny}
        >
          {t("deny")}
        </Button>
      </div>
    </div>
  );
};

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
  // The workspace picked a moment ago, which the client's tokens are bound
  // to.
  const workspace = authClient.useActiveOrganization();
  const [allowPublishing, setAllowPublishing] = useState(true);
  const [allowAds, setAllowAds] = useState(true);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAnswer = (accept: boolean) => () => {
    startTransition(async () => {
      // Without publishing or ads, Better Auth is sent the scopes that
      // remain, and issues tokens for those alone.
      const answered = await authClient.oauth2.consent(
        accept
          ? consentAnswer(scopes, {
              ads: allowAds,
              publishing: allowPublishing,
            })
          : { accept: false }
      );

      setFailed(answered.error !== null || !isOAuthRedirect(answered.data));
    });
  };

  return (
    <OAuthConsentView
      allowAds={allowAds}
      allowPublishing={allowPublishing}
      failed={failed}
      pending={isPending}
      redirectHost={redirectHost}
      scopes={scopes}
      workspaceName={workspace.data?.name}
      onAdsChange={setAllowAds}
      onAllow={handleAnswer(true)}
      onDeny={handleAnswer(false)}
      onPublishingChange={setAllowPublishing}
    />
  );
};
