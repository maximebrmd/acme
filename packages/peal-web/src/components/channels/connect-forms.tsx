"use client";

import { useTranslations } from "next-intl";
import type {
  InstagramConnection,
  LinkedInConnection,
  Platform,
} from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { useState } from "react";
import type { ChangeEvent, SubmitEvent } from "react";

import { useChannelErrorText } from "#channels/channel-error-text.ts";
import type { ChannelErrorKey } from "#channels/channels-api.ts";
import { useConnect } from "#channels/use-connect.ts";
import { ConnectInstagram } from "#components/channels/connect-instagram.tsx";
import { ConnectLinkedIn } from "#components/channels/connect-linkedin.tsx";
import {
  ConnectMeta,
  metaPlatforms,
} from "#components/channels/connect-meta.tsx";
import type { MetaPlatform } from "#components/channels/connect-meta.tsx";

const ErrorMessage = ({
  error,
}: {
  readonly error: ChannelErrorKey | null;
}) => {
  const errorText = useChannelErrorText();

  return error === null ? null : (
    <Alert variant="destructive">
      <AlertDescription>{errorText(error)}</AlertDescription>
    </Alert>
  );
};

interface FieldProps {
  readonly hint: string;
  readonly id: string;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly required: boolean;
  readonly value: string;
}

const Field = ({ hint, id, label, onChange, required, value }: FieldProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="text"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={value}
        onChange={handleChange}
        aria-describedby={`${id}-hint`}
        required={required}
      />
      <p id={`${id}-hint`} className="text-muted-foreground text-xs">
        {hint}
      </p>
    </div>
  );
};

const ConnectMastodon = ({ workspaceId }: { readonly workspaceId: string }) => {
  const t = useTranslations("ChannelsPage");
  const [instance, setInstance] = useState("");
  const { error, isPending, start } = useConnect(workspaceId, "mastodon");

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    start({ instance });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{t("mastodonTitle")}</h3>
        </CardTitle>
        <CardDescription>{t("mastodonDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ErrorMessage error={error} />
          <Field
            id="mastodon-instance"
            label={t("instance")}
            hint={t("instanceHint")}
            value={instance}
            onChange={setInstance}
            required
          />
          <Button type="submit" disabled={isPending} focusableWhenDisabled>
            {isPending ? t("connecting") : t("connectMastodon")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const ConnectBluesky = ({ workspaceId }: { readonly workspaceId: string }) => {
  const t = useTranslations("ChannelsPage");
  const [handle, setHandle] = useState("");
  const { error, isPending, start } = useConnect(workspaceId, "bluesky");

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    start(handle.trim() === "" ? {} : { handle });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{t("blueskyTitle")}</h3>
        </CardTitle>
        <CardDescription>{t("blueskyDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ErrorMessage error={error} />
          <Field
            id="bluesky-handle"
            label={t("handle")}
            hint={t("handleHint")}
            value={handle}
            onChange={setHandle}
            required={false}
          />
          <Button type="submit" disabled={isPending} focusableWhenDisabled>
            {isPending ? t("connecting") : t("connectBluesky")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// The platforms whose sign-in needs nothing typed first: a button.
type ButtonPlatform =
  | "googleBusiness"
  | "linkedin"
  | "pinterest"
  | "tiktok"
  | "x"
  | "youtube";

const buttonPlatforms: readonly ButtonPlatform[] = [
  "linkedin",
  "x",
  "tiktok",
  "youtube",
  "pinterest",
  "googleBusiness",
];

const ConnectWithButton = ({
  platform,
  workspaceId,
}: {
  readonly platform: ButtonPlatform;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("PlatformConnect");
  const { error, isPending, start } = useConnect(workspaceId, platform);

  const handleClick = () => {
    start({});
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{t(`${platform}.title`)}</h3>
        </CardTitle>
        <CardDescription>{t(`${platform}.description`)}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <ErrorMessage error={error} />
          <Button
            type="button"
            onClick={handleClick}
            disabled={isPending}
            focusableWhenDisabled
          >
            {isPending ? t("connecting") : t(`${platform}.connect`)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const ConnectWithMeta = ({
  platform,
  workspaceId,
}: {
  readonly platform: MetaPlatform;
  readonly workspaceId: string;
}) => {
  const { error, isPending, start } = useConnect(workspaceId, platform);

  const handleConnect = () => {
    start({});
  };

  return (
    <ConnectMeta
      platform={platform}
      error={error}
      isPending={isPending}
      onConnect={handleConnect}
    />
  );
};

const ConnectWithLinkedIn = ({
  connections,
  workspaceId,
}: {
  readonly connections: readonly LinkedInConnection[];
  readonly workspaceId: string;
}) => {
  const { error, isPending, start } = useConnect(workspaceId, "linkedin");

  const handleConnect = (connection: LinkedInConnection) => {
    start({ connection });
  };

  return (
    <ConnectLinkedIn
      connections={connections}
      error={error}
      isPending={isPending}
      onConnect={handleConnect}
    />
  );
};

const ConnectWithInstagram = ({
  connections,
  workspaceId,
}: {
  readonly connections: readonly InstagramConnection[];
  readonly workspaceId: string;
}) => {
  const { error, isPending, start } = useConnect(workspaceId, "instagram");

  const handleConnect = (connection: InstagramConnection) => {
    start({ connection });
  };

  return (
    <ConnectInstagram
      connections={connections}
      error={error}
      isPending={isPending}
      onConnect={handleConnect}
    />
  );
};

/**
 * Where a member starts connecting an account, for each platform this
 * server connects: a form for Mastodon and Bluesky, which ask for a server
 * or a handle, a button for X, TikTok, YouTube, Pinterest and Google
 * Business Profile, one for each of Instagram's ways in the server has,
 * one for a LinkedIn profile and one for company pages on a server that
 * connects pages, and Meta's sign-in for Threads and Facebook Pages.
 */
export const ConnectForms = ({
  instagramConnections,
  linkedinConnections,
  platforms,
  workspaceId,
}: {
  readonly instagramConnections: readonly InstagramConnection[];
  /** What the server connects on LinkedIn: profiles, pages, or both. */
  readonly linkedinConnections: readonly LinkedInConnection[];
  readonly platforms: readonly Platform[];
  readonly workspaceId: string;
}) => {
  const offered = new Set(platforms);

  // A server with the app for pages offers the choice; one without keeps
  // LinkedIn's single button, for a profile.
  const linkedinChoice = linkedinConnections.includes("linkedinPage");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {offered.has("mastodon") ? (
        <ConnectMastodon workspaceId={workspaceId} />
      ) : null}
      {offered.has("bluesky") ? (
        <ConnectBluesky workspaceId={workspaceId} />
      ) : null}
      {offered.has("linkedin") && linkedinChoice ? (
        <ConnectWithLinkedIn
          connections={linkedinConnections}
          workspaceId={workspaceId}
        />
      ) : null}
      {buttonPlatforms.flatMap((platform) =>
        offered.has(platform) && !(platform === "linkedin" && linkedinChoice)
          ? [
              <ConnectWithButton
                key={platform}
                platform={platform}
                workspaceId={workspaceId}
              />,
            ]
          : []
      )}
      {offered.has("instagram") && instagramConnections.length > 0 ? (
        <ConnectWithInstagram
          connections={instagramConnections}
          workspaceId={workspaceId}
        />
      ) : null}
      {metaPlatforms.flatMap((platform) =>
        offered.has(platform) && platform !== "instagram"
          ? [
              <ConnectWithMeta
                key={platform}
                platform={platform}
                workspaceId={workspaceId}
              />,
            ]
          : []
      )}
    </div>
  );
};
