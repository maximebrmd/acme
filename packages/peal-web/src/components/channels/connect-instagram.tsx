"use client";

import { useTranslations } from "next-intl";
import type { InstagramConnection } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";

import { useChannelErrorText } from "#channels/channel-error-text.ts";
import type { ChannelErrorKey } from "#channels/channels-api.ts";

interface ConnectInstagramProps {
  /** The ways in the server has, the one it prefers first. */
  readonly connections: readonly InstagramConnection[];
  readonly error: ChannelErrorKey | null;
  readonly isPending: boolean;
  readonly onConnect: (connection: InstagramConnection) => void;
}

// Where a member starts connecting an Instagram account: straight on
// Instagram, which most professional accounts can, or through a Facebook
// Page, for accounts run from one. Each way the server has is a button,
// the one it prefers first and filled.
export const ConnectInstagram = ({
  connections,
  error,
  isPending,
  onConnect,
}: ConnectInstagramProps) => {
  const t = useTranslations("InstagramChannels");
  const errorText = useChannelErrorText();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{t("title")}</h3>
        </CardTitle>
        <CardDescription>
          {connections.map((connection) => (
            <span key={connection} className="block">
              {t("description", { connection })}
            </span>
          ))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {error === null ? null : (
            <Alert variant="destructive">
              <AlertDescription>{errorText(error)}</AlertDescription>
            </Alert>
          )}
          {connections.map((connection, index) => (
            <Button
              key={connection}
              type="button"
              variant={index === 0 ? "default" : "outline"}
              onClick={() => {
                onConnect(connection);
              }}
              disabled={isPending}
              focusableWhenDisabled
            >
              {isPending ? t("connecting") : t("connect", { connection })}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
