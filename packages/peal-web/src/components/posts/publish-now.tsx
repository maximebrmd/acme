"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { Channel } from "peal-contract";
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

import { whereItGoes } from "#posts/publish-now.ts";

/**
 * What "Publish now" asks before it sends: that the post goes out at once,
 * in public, on these channels, and cannot be taken back from here.
 */
export const PublishNowSummary = ({
  channels,
  skipped,
}: {
  /** The channels the post publishes on, each by its name. */
  readonly channels: readonly string[];
  /** The channels it goes to that are off or to reconnect: no post there. */
  readonly skipped: readonly string[];
}) => {
  const t = useTranslations("Posts.Composer");
  const format = useFormatter();

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>{t("publishNowDescription", { count: channels.length })}</p>
      <p className="font-medium">{t("publishNowChannels")}</p>
      <ul className="list-disc pl-5">
        {channels.map((channel) => (
          <li key={channel}>{channel}</li>
        ))}
      </ul>
      {skipped.length === 0 ? null : (
        <p>
          {t("publishNowSkipped", {
            channels: format.list(skipped),
            count: skipped.length,
          })}
        </p>
      )}
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
  /** The channels the post goes to. */
  readonly channels: readonly Channel[];
  readonly enabled: boolean;
  readonly onConfirm: () => void;
}) => {
  const t = useTranslations("Posts.Composer");
  const where = whereItGoes(channels);
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
            <PublishNowSummary
              channels={where.publishing}
              skipped={where.skipped}
            />
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
