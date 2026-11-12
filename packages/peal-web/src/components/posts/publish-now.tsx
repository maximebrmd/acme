"use client";

import { useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "peal-ui/components/dialog";
import { useState } from "react";

/**
 * What "Publish now" asks before it sends: that the post goes out at once,
 * in public, on these channels, and cannot be taken back from here.
 */
export const PublishNowSummary = ({
  channels,
}: {
  /** The channels the post goes to, each by its name. */
  readonly channels: readonly string[];
}) => {
  const t = useTranslations("Posts.Composer");

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>{t("publishNowDescription", { count: channels.length })}</p>
      <p className="font-medium">{t("publishNowChannels")}</p>
      <ul className="list-disc pl-5">
        {channels.map((channel) => (
          <li key={channel}>{channel}</li>
        ))}
      </ul>
    </div>
  );
};

/**
 * "Publish now", which asks once: the person confirms, and only then does
 * the composer take the time, so "now" is when they chose.
 */
export const PublishNowButton = ({
  busy,
  channels,
  enabled,
  onConfirm,
}: {
  /** Whether this action runs now. */
  readonly busy: boolean;
  readonly channels: readonly string[];
  readonly enabled: boolean;
  readonly onConfirm: () => void;
}) => {
  const t = useTranslations("Posts.Composer");
  // Once confirmed, the button sends nothing more while the dialog closes.
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          setConfirmed(false);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="secondary"
            disabled={!enabled}
            focusableWhenDisabled
          />
        }
      >
        {busy ? t("publishingNow") : t("publishNow")}
      </DialogTrigger>
      <DialogContent closeLabel={t("closeDialog")}>
        <DialogHeader>
          <DialogTitle>{t("publishNowTitle")}</DialogTitle>
          <DialogDescription render={<div />}>
            <PublishNowSummary channels={channels} />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {t("keepForLater")}
          </DialogClose>
          <DialogClose
            render={<Button disabled={confirmed} />}
            onClick={() => {
              setConfirmed(true);
              onConfirm();
            }}
          >
            {t("confirmPublishNow")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
