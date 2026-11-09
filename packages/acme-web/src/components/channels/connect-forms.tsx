"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { Platform } from "acme-contract";
import { Alert, AlertDescription } from "acme-ui/components/alert";
import { Button } from "acme-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "acme-ui/components/card";
import { Input } from "acme-ui/components/input";
import { Label } from "acme-ui/components/label";
import { Skeleton } from "acme-ui/components/skeleton";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { ChangeEvent, SubmitEvent } from "react";

import {
  connectablePlatformsOf,
  connectChannel,
  failureOf,
} from "#channels/channels-api.ts";
import type { ChannelErrorKey } from "#channels/channels-api.ts";
import { rememberConnection } from "#channels/pending-connection.ts";
import {
  ConnectMeta,
  metaPlatforms,
} from "#components/channels/connect-meta.tsx";
import type { MetaPlatform } from "#components/channels/connect-meta.tsx";

// Starts a connection, then leaves for the platform's sign-in page.
const useConnect = (workspaceId: string, platform: Platform) => {
  const connect = useAtomSet(connectChannel, { mode: "promiseExit" });
  const [error, setError] = useState<ChannelErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const start = (payload: {
    readonly handle?: string;
    readonly instance?: string;
  }) => {
    startTransition(async () => {
      const exit = await connect({
        params: { platform, workspaceId },
        payload,
      });

      if (exit._tag === "Success") {
        setError(null);
        rememberConnection({ platform, workspaceId });
        globalThis.location.assign(exit.value.authorizationUrl);

        return;
      }

      setError(Option.getOrElse(failureOf(exit), () => "unknown" as const));
    });
  };

  return { error, isPending, start };
};

const ErrorMessage = ({
  error,
}: {
  readonly error: ChannelErrorKey | null;
}) => {
  const t = useTranslations("ChannelsPage");

  return error === null ? null : (
    <Alert variant="destructive">
      <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
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

/**
 * Where a member starts connecting an account, for each platform this
 * server connects: a platform it lacks the settings for is not offered.
 */
export const ConnectForms = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const t = useTranslations("ChannelsPage");
  const meta = useTranslations("MetaChannels");
  const connectable = useAtomValue(connectablePlatformsOf(workspaceId));
  const handleRetry = useAtomRefresh(connectablePlatformsOf(workspaceId));

  if (AsyncResult.isFailure(connectable)) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="destructive">
          <AlertDescription>{meta("platformsFailed")}</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (!AsyncResult.isSuccess(connectable)) {
    return <Skeleton className="h-40 w-full" aria-busy />;
  }

  const offered = new Set(connectable.value.platforms);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {offered.has("mastodon") ? (
        <ConnectMastodon workspaceId={workspaceId} />
      ) : null}
      {offered.has("bluesky") ? (
        <ConnectBluesky workspaceId={workspaceId} />
      ) : null}
      {metaPlatforms
        .filter((platform) => offered.has(platform))
        .map((platform) => (
          <ConnectWithMeta
            key={platform}
            platform={platform}
            workspaceId={workspaceId}
          />
        ))}
    </div>
  );
};
