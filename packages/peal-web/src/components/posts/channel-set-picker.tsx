"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { maxChannelSetNameLength } from "peal-contract";
import type {
  Channel,
  ChannelOptions,
  ChannelSet,
  Permission,
} from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "peal-ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "peal-ui/components/dropdown-menu";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { useId, useState, useTransition } from "react";
import type { ReactNode, SubmitEvent } from "react";
import { toast } from "sonner";

import {
  channelSetsChanged,
  createChannelSet,
  workspaceChannelSets,
} from "#channel-sets/atoms.ts";
import {
  appliedSet,
  channelSetDetailsOf,
  connectedChannels,
} from "#channel-sets/selection.ts";
import type { AppliedSet } from "#channel-sets/selection.ts";
import { SavedItemErrorAlert } from "#components/settings/saved-item-error.tsx";
import { savedItemErrorOf } from "#settings/saved-item-error.ts";
import type { SavedItemError } from "#settings/saved-item-error.ts";

/** A set the member chose, and how many of its channels were left out. */
interface Chosen {
  readonly dropped: number;
  readonly name: string;
}

/**
 * The workspace's channel sets, to start a post from one, with what saves
 * the current selection as a set (`save`), and a warning once a set was
 * chosen whose channels are not all connected any more.
 */
export const ChannelSetPickerView = ({
  channels,
  chosen,
  disabled,
  onChoose,
  save,
  sets,
}: {
  /** The workspace's connected channels. */
  readonly channels: readonly Channel[];
  readonly chosen: Chosen | null;
  readonly disabled: boolean;
  readonly onChoose: (set: ChannelSet) => void;
  readonly save?: ReactNode;
  readonly sets: readonly ChannelSet[];
}) => {
  const t = useTranslations("ChannelSets");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {sets.length === 0 ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  focusableWhenDisabled
                />
              }
            >
              {t("pickerTrigger")}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("pickerLabel")}</DropdownMenuLabel>
                {sets.map((set) => (
                  <DropdownMenuItem
                    key={set.id}
                    onClick={() => {
                      onChoose(set);
                    }}
                  >
                    {t("pickerItem", {
                      count: connectedChannels(set, channels).length,
                      name: set.name,
                    })}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {save}
      </div>
      {chosen === null || chosen.dropped === 0 ? null : (
        <Alert>
          <AlertDescription>
            {t("pickerDropped", { count: chosen.dropped, name: chosen.name })}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Saves the channels ticked, and the options filled for them, as a set
// under the name the member gives.
const SaveSelection = ({
  channelIds,
  disabled,
  options,
  workspaceId,
}: {
  readonly channelIds: readonly string[];
  readonly disabled: boolean;
  readonly options: readonly ChannelOptions[];
  readonly workspaceId: string;
}) => {
  const t = useTranslations("ChannelSets");
  const settings = useTranslations("Settings");
  const tComposer = useTranslations("Posts.Composer");
  const create = useAtomSet(createChannelSet, { mode: "promiseExit" });
  const nameId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<SavedItemError | null>(null);
  const [isPending, startTransition] = useTransition();
  const details = channelSetDetailsOf(name, channelIds, options);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (Option.isNone(details)) {
      return;
    }

    startTransition(async () => {
      const exit = await create({
        params: { workspaceId },
        payload: details.value,
        reactivityKeys: channelSetsChanged(workspaceId),
      });

      if (Exit.isSuccess(exit)) {
        setError(null);
        setName("");
        setOpen(false);
        toast.success(t("created"));
      } else {
        setError(
          Option.getOrElse(savedItemErrorOf(exit), (): SavedItemError => ({
            key: "unknown",
          }))
        );
      }
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled || channelIds.length === 0}
        focusableWhenDisabled
        onClick={() => {
          setOpen(true);
        }}
      >
        {t("saveSelection")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={tComposer("closeDialog")}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{t("saveSelectionTitle")}</DialogTitle>
              <DialogDescription>
                {t("saveSelectionDescription", { count: channelIds.length })}
              </DialogDescription>
            </DialogHeader>
            <SavedItemErrorAlert error={error} kind="channelSet" />
            <div className="flex flex-col gap-2">
              <Label htmlFor={nameId}>{t("name")}</Label>
              <Input
                id={nameId}
                value={name}
                maxLength={maxChannelSetNameLength}
                disabled={isPending}
                required
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setOpen(false);
                }}
              >
                {settings("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isPending || Option.isNone(details)}
                focusableWhenDisabled
              >
                {isPending ? t("creating") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * Above the composer's channels, while the post is written: starts it
 * from a channel set, which selects the set's connected channels and
 * fills the options it keeps for them, and saves the channels ticked as a
 * new set, for members who may change posts. Nothing shows until the sets
 * are known, nor to a member with no set to choose and none to save.
 */
export const ChannelSetPicker = ({
  channelIds,
  channels,
  disabled,
  editable,
  onApply,
  options,
  permissions,
  workspaceId,
}: {
  /** The channels ticked now. */
  readonly channelIds: readonly string[];
  /** The workspace's connected channels. */
  readonly channels: readonly Channel[];
  readonly disabled: boolean;
  /** Whether the post is still written; otherwise nothing shows. */
  readonly editable: boolean;
  /** Selects a set's channels and fills its options. */
  readonly onApply: (applied: AppliedSet) => void;
  /** The options filled now, for the channels ticked. */
  readonly options: readonly ChannelOptions[];
  readonly permissions: readonly Permission[];
  readonly workspaceId: string;
}) => {
  const sets = useAtomValue(workspaceChannelSets(workspaceId));
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const maySave = permissions.includes("post:update");
  const known = AsyncResult.isSuccess(sets) ? sets.value : [];

  if (!editable || !AsyncResult.isSuccess(sets)) {
    return null;
  }

  if (known.length === 0 && !maySave) {
    return null;
  }

  return (
    <ChannelSetPickerView
      channels={channels}
      chosen={chosen}
      disabled={disabled}
      sets={known}
      onChoose={(set) => {
        const applied = appliedSet(set, channels);

        setChosen({ dropped: applied.dropped, name: set.name });
        onApply(applied);
      }}
      {...(maySave
        ? {
            save: (
              <SaveSelection
                channelIds={channelIds}
                disabled={disabled}
                options={options}
                workspaceId={workspaceId}
              />
            ),
          }
        : {})}
    />
  );
};
