"use client";

import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import { useTranslations } from "next-intl";
import { maxChannelLabelLength } from "peal-contract";
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
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { useChannelErrorText } from "#channels/channel-error-text.ts";
import { labelUpdateOf } from "#channels/channel-label.ts";
import { channelName } from "#channels/channel-name.ts";
import {
  channelsChanged,
  failureOf,
  renameChannel,
} from "#channels/channels-api.ts";

/**
 * The one field of a channel's name in Peal, with what the name is for:
 * shown in Peal only, beside the handle, and sent to no platform.
 */
export const RenameChannelFields = ({
  disabled,
  id,
  onChange,
  value,
}: {
  readonly disabled: boolean;
  /** Tells this field from another channel's on the page. */
  readonly id: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
}) => {
  const t = useTranslations("ChannelsPage");
  const tooLong = Option.isNone(labelUpdateOf(value));

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{t("rename.name")}</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        autoComplete="off"
        aria-describedby={`${id}-hint`}
        aria-invalid={tooLong}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      <p id={`${id}-hint`} className="text-muted-foreground text-xs">
        {t("rename.hint", { max: maxChannelLabelLength })}
      </p>
      <p role="alert" className="text-destructive text-xs">
        {tooLong ? t("rename.tooLong", { max: maxChannelLabelLength }) : null}
      </p>
    </div>
  );
};

interface RenameChannelProps {
  readonly channel: Channel;
  readonly workspaceId: string;
}

// Names a channel for the workspace, or takes its name back: a dialog with
// the one field, which closes once the name is saved.
export const RenameChannel = ({ channel, workspaceId }: RenameChannelProps) => {
  const t = useTranslations("ChannelsPage");
  const errorText = useChannelErrorText();
  const rename = useAtomSet(renameChannel, { mode: "promiseExit" });
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(channel.label ?? "");
  const [isSaving, startSaving] = useTransition();
  const id = useId();
  const update = labelUpdateOf(value);
  const handle = channelName(channel);

  const save = (label: string | null) => {
    startSaving(async () => {
      const exit = await rename({
        params: { channelId: channel.id, workspaceId },
        payload: { label },
        reactivityKeys: channelsChanged(workspaceId),
      });

      Option.match(failureOf(exit), {
        onNone: () => {
          toast.success(
            label === null
              ? t("rename.cleared", { handle: channel.handle })
              : t("rename.saved", { handle: channel.handle, label })
          );
          setOpen(false);
        },
        onSome: (key) => {
          toast.error(errorText(key));
        },
      });
    });
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Option.isSome(update)) {
      save(update.value.label);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);

        // Opens on the name the channel has now, whatever was typed before.
        if (next) {
          setValue(channel.label ?? "");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={t("rename.account", { handle })}
          />
        }
      >
        {t("rename.open")}
      </DialogTrigger>
      <DialogContent closeLabel={t("rename.close")}>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {t("rename.title", { handle: channel.handle })}
            </DialogTitle>
            <DialogDescription>{t("rename.description")}</DialogDescription>
          </DialogHeader>
          <RenameChannelFields
            id={id}
            value={value}
            disabled={isSaving}
            onChange={setValue}
          />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("cancel")}
            </DialogClose>
            {channel.label === null ? null : (
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                focusableWhenDisabled
                onClick={() => {
                  save(null);
                }}
              >
                {t("rename.clear")}
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSaving || Option.isNone(update)}
              focusableWhenDisabled
            >
              {isSaving ? t("rename.saving") : t("rename.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
