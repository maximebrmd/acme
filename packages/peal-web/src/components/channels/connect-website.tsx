"use client";

import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "peal-ui/components/dialog";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { useId, useState, useTransition } from "react";
import type { ChangeEvent, SubmitEvent } from "react";
import { toast } from "sonner";

import { useChannelErrorText } from "#channels/channel-error-text.ts";
import {
  channelsChanged,
  connectSite,
  failureOf,
} from "#channels/channels-api.ts";
import type { ChannelErrorKey } from "#channels/channels-api.ts";

interface WebsiteFieldsProps {
  /** The address to start from: the site's, to reconnect it. */
  readonly address?: string;
  readonly onConnected?: () => void;
  readonly workspaceId: string;
}

/**
 * The form that connects a WordPress site: its address, the user Peal
 * publishes as, and an application password made for Peal. The password
 * goes to the server once, and is never shown again.
 */
export const WebsiteFields = ({
  address: startAddress = "",
  onConnected,
  workspaceId,
}: WebsiteFieldsProps) => {
  const t = useTranslations("ChannelsPage");
  const errorText = useChannelErrorText();
  const connect = useAtomSet(connectSite, { mode: "promiseExit" });
  const [address, setAddress] = useState(startAddress);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ChannelErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const id = useId();

  const onAddress = (event: ChangeEvent<HTMLInputElement>) => {
    setAddress(event.target.value);
  };

  const onUser = (event: ChangeEvent<HTMLInputElement>) => {
    setUserName(event.target.value);
  };

  const onPassword = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const exit = await connect({
        params: { workspaceId },
        payload: {
          address,
          applicationPassword: password,
          platform: "wordpress",
          userName,
        },
        reactivityKeys: channelsChanged(workspaceId),
      });

      Option.match(failureOf(exit), {
        onNone: () => {
          if (exit._tag === "Success") {
            setPassword("");
            toast.success(
              t("websiteConnected", {
                site: exit.value.displayName ?? exit.value.handle,
              })
            );
            onConnected?.();
          }
        },
        onSome: setError,
      });
    });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {error === null ? null : (
        <Alert variant="destructive">
          <AlertDescription>{errorText(error)}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-address`}>{t("websiteAddress")}</Label>
        <Input
          id={`${id}-address`}
          type="url"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={address}
          onChange={onAddress}
          aria-describedby={`${id}-address-hint`}
        />
        <p id={`${id}-address-hint`} className="text-muted-foreground text-xs">
          {t("websiteAddressHint")}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-user`}>{t("websiteUser")}</Label>
        <Input
          id={`${id}-user`}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={userName}
          onChange={onUser}
          aria-describedby={`${id}-user-hint`}
        />
        <p id={`${id}-user-hint`} className="text-muted-foreground text-xs">
          {t("websiteUserHint")}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-password`}>{t("websitePassword")}</Label>
        <Input
          id={`${id}-password`}
          type="password"
          autoComplete="off"
          required
          value={password}
          onChange={onPassword}
          aria-describedby={`${id}-password-hint`}
        />
        <p id={`${id}-password-hint`} className="text-muted-foreground text-xs">
          {t("websitePasswordHint")}
        </p>
      </div>
      <Button type="submit" disabled={isPending} focusableWhenDisabled>
        {isPending ? t("connecting") : t("connectWebsite")}
      </Button>
    </form>
  );
};

/** Where a member connects a WordPress site, among the platforms. */
export const ConnectWebsite = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const t = useTranslations("ChannelsPage");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{t("websiteTitle")}</h3>
        </CardTitle>
        <CardDescription>{t("websiteDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <WebsiteFields workspaceId={workspaceId} />
      </CardContent>
    </Card>
  );
};

/**
 * Reconnects a website's channel: the same form, on the site's address,
 * for a new application password, as a site has no sign-in to go back to.
 */
export const ReconnectWebsite = ({
  handle,
  needsReconnect,
  workspaceId,
}: {
  /** The site's home page without its scheme, as the channel keeps it. */
  readonly handle: string;
  readonly needsReconnect: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("ChannelsPage");
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={needsReconnect ? "default" : "outline"}
            size="sm"
            aria-label={t("reconnectAccount", { handle })}
          />
        }
      >
        {t("reconnect")}
      </DialogTrigger>
      <DialogContent closeLabel={t("cancel")}>
        <DialogHeader>
          <DialogTitle>{t("reconnectWebsite", { handle })}</DialogTitle>
          <DialogDescription>{t("websiteDescription")}</DialogDescription>
        </DialogHeader>
        <WebsiteFields
          address={`https://${handle}`}
          onConnected={close}
          workspaceId={workspaceId}
        />
      </DialogContent>
    </Dialog>
  );
};
