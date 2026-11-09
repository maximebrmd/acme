"use client";

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
import { useTranslations } from "next-intl";

import type { ChannelErrorKey } from "#channels/channels-api.ts";

/** The platforms Meta's apps connect, in the order the page offers them. */
export const metaPlatforms = ["facebook", "instagram", "threads"] as const;

export type MetaPlatform = (typeof metaPlatforms)[number];

/** Whether the platform signs in through one of Meta's apps. */
export const isMetaPlatform = (platform: Platform): platform is MetaPlatform =>
  metaPlatforms.some((meta) => meta === platform);

interface ConnectMetaProps {
  readonly error: ChannelErrorKey | null;
  readonly isPending: boolean;
  readonly onConnect: () => void;
  readonly platform: MetaPlatform;
}

// Where a member starts connecting accounts of one of Meta's platforms:
// nothing to type, the sign-in happens on Meta's page. Facebook and
// Instagram then come back with the accounts to choose.
export const ConnectMeta = ({
  error,
  isPending,
  onConnect,
  platform,
}: ConnectMetaProps) => {
  const t = useTranslations("MetaChannels");
  const errors = useTranslations("ChannelsPage.errors");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{t("title", { platform })}</h3>
        </CardTitle>
        <CardDescription>{t("description", { platform })}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {error === null ? null : (
            <Alert variant="destructive">
              <AlertDescription>{errors(error)}</AlertDescription>
            </Alert>
          )}
          <Button
            type="button"
            onClick={onConnect}
            disabled={isPending}
            focusableWhenDisabled
          >
            {isPending ? t("connecting") : t("connect", { platform })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
