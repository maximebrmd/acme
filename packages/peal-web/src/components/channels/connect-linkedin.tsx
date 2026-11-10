"use client";

import { useTranslations } from "next-intl";
import type { LinkedInConnection } from "peal-contract";
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

interface ConnectLinkedInProps {
  /** What the server connects: profiles, pages, or both. */
  readonly connections: readonly LinkedInConnection[];
  readonly error: ChannelErrorKey | null;
  readonly isPending: boolean;
  readonly onConnect: (connection: LinkedInConnection) => void;
}

// Where a member starts connecting LinkedIn on a server that has the app
// for company pages: their own profile, or the pages they administer, each
// through its own sign-in, as LinkedIn grants the two to separate apps.
// Each one the server has is a button, the first filled.
export const ConnectLinkedIn = ({
  connections,
  error,
  isPending,
  onConnect,
}: ConnectLinkedInProps) => {
  const t = useTranslations("LinkedInChannels");
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
