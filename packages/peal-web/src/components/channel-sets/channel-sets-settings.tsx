"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { Channel, ChannelSet } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import {
  channelSetsChanged,
  createChannelSet,
  deleteChannelSet,
  updateChannelSet,
  workspaceChannelSets,
} from "#channel-sets/atoms.ts";
import {
  channelSetDetailsOf,
  editableChannelIds,
  missingChannels,
} from "#channel-sets/selection.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { DeleteSavedItem } from "#components/settings/delete-saved-item.tsx";
import {
  SettingsLoadFailed,
  SettingsLoading,
} from "#components/settings/settings-status.tsx";
import { workspaceChannels } from "#posts/api.ts";
import { savedItemErrorOf } from "#settings/saved-item-error.ts";
import type { SavedItemError } from "#settings/saved-item-error.ts";

import {
  ChannelSetFieldsView,
  ChannelSetItemView,
} from "./channel-set-views.tsx";
import type { ChannelSetDraft } from "./channel-set-views.tsx";

// A set's form: its name and channels, saved together. The options the
// set keeps stay with the channels it keeps.
const EditForm = ({
  channels,
  onClose,
  set,
  workspaceId,
}: {
  readonly channels: readonly Channel[];
  readonly onClose: () => void;
  readonly set: ChannelSet;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("ChannelSets");
  const settings = useTranslations("Settings");
  const update = useAtomSet(updateChannelSet, { mode: "promiseExit" });
  const [error, setError] = useState<SavedItemError | null>(null);
  const [isPending, startTransition] = useTransition();

  const [draft, setDraft] = useState<ChannelSetDraft>(() => ({
    channelIds: editableChannelIds(set, channels),
    name: set.name,
  }));

  const details = channelSetDetailsOf(
    draft.name,
    draft.channelIds,
    set.options
  );

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Option.isNone(details)) {
      return;
    }

    startTransition(async () => {
      const exit = await update({
        params: { channelSetId: set.id, workspaceId },
        payload: details.value,
        reactivityKeys: channelSetsChanged(workspaceId),
      });

      Option.match(savedItemErrorOf(exit), {
        onNone: () => {
          toast.success(t("saved"));
          onClose();
        },
        onSome: setError,
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ChannelSetFieldsView
        channels={channels}
        draft={draft}
        dropped={missingChannels(set, channels).length}
        error={error}
        disabled={isPending}
        idPrefix={set.id}
        onChange={setDraft}
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isPending || Option.isNone(details)}
          focusableWhenDisabled
        >
          {isPending ? settings("saving") : t("save")}
        </Button>
        <Button variant="outline" disabled={isPending} onClick={onClose}>
          {settings("cancel")}
        </Button>
      </div>
    </form>
  );
};

// One set, with its form once the member opened it.
const SetRow = ({
  channels,
  mayManage,
  set,
  workspaceId,
}: {
  readonly channels: readonly Channel[];
  readonly mayManage: boolean;
  readonly set: ChannelSet;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("ChannelSets");
  const nameId = useId();
  const remove = useAtomSet(deleteChannelSet, { mode: "promiseExit" });
  const [editing, setEditing] = useState(false);

  return (
    <ChannelSetItemView
      channels={channels}
      set={set}
      nameId={nameId}
      {...(mayManage
        ? {
            actions: (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  aria-describedby={nameId}
                  aria-expanded={editing}
                  onClick={() => {
                    setEditing(!editing);
                  }}
                >
                  {t("edit")}
                </Button>
                <DeleteSavedItem
                  describedBy={nameId}
                  kind="channelSet"
                  title={t("deleteTitle", { name: set.name })}
                  description={t("deleteDescription")}
                  deleted={t("deleted")}
                  remove={async () =>
                    await remove({
                      params: { channelSetId: set.id, workspaceId },
                      reactivityKeys: channelSetsChanged(workspaceId),
                    })
                  }
                />
              </>
            ),
          }
        : {})}
    >
      {editing ? (
        <EditForm
          channels={channels}
          set={set}
          workspaceId={workspaceId}
          onClose={() => {
            setEditing(false);
          }}
        />
      ) : null}
    </ChannelSetItemView>
  );
};

// A new set: a name, and the channels ticked.
const CreateForm = ({
  channels,
  workspaceId,
}: {
  readonly channels: readonly Channel[];
  readonly workspaceId: string;
}) => {
  const t = useTranslations("ChannelSets");
  const create = useAtomSet(createChannelSet, { mode: "promiseExit" });
  const [error, setError] = useState<SavedItemError | null>(null);
  const [isPending, startTransition] = useTransition();

  const [draft, setDraft] = useState<ChannelSetDraft>({
    channelIds: [],
    name: "",
  });

  const details = channelSetDetailsOf(draft.name, draft.channelIds, []);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

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
        setDraft({ channelIds: [], name: "" });
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ChannelSetFieldsView
        channels={channels}
        draft={draft}
        dropped={0}
        error={error}
        disabled={isPending}
        idPrefix="new"
        onChange={setDraft}
      />
      <div>
        <Button
          type="submit"
          disabled={isPending || Option.isNone(details)}
          focusableWhenDisabled
        >
          {isPending ? t("creating") : t("create")}
        </Button>
      </div>
    </form>
  );
};

// The page once the workspace's channels and sets are known.
const Loaded = ({
  mayManage,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("ChannelSets");
  const setsAtom = workspaceChannelSets(workspaceId);
  const channelsAtom = workspaceChannels(workspaceId);
  const sets = useAtomValue(setsAtom);
  const channels = useAtomValue(channelsAtom);
  const reloadSets = useAtomRefresh(setsAtom);
  const reloadChannels = useAtomRefresh(channelsAtom);

  if (AsyncResult.isFailure(sets) || AsyncResult.isFailure(channels)) {
    return (
      <SettingsLoadFailed
        onRetry={() => {
          reloadSets();
          reloadChannels();
        }}
      />
    );
  }

  if (!(AsyncResult.isSuccess(sets) && AsyncResult.isSuccess(channels))) {
    return <SettingsLoading />;
  }

  return (
    <>
      <section
        aria-labelledby="channel-sets-title"
        className="flex flex-col gap-2"
      >
        <h2 id="channel-sets-title" className="text-xl font-semibold">
          {t("listTitle")}
        </h2>
        {sets.value.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y">
            {sets.value.map((set) => (
              <SetRow
                key={set.id}
                channels={channels.value}
                mayManage={mayManage}
                set={set}
                workspaceId={workspaceId}
              />
            ))}
          </ul>
        )}
      </section>
      {mayManage ? (
        <section
          aria-labelledby="create-channel-set-title"
          className="flex flex-col gap-4"
        >
          <h2 id="create-channel-set-title" className="text-xl font-semibold">
            {t("createTitle")}
          </h2>
          <CreateForm channels={channels.value} workspaceId={workspaceId} />
        </section>
      ) : null}
    </>
  );
};

/**
 * The workspace's channel sets: the list, and for those who may change
 * posts a form to add one, and to change or delete each.
 */
export const ChannelSetsSettings = ({
  mayManage,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const hydrated = useHydrated();

  return (
    <div className="flex flex-col gap-8">
      {hydrated ? (
        <Loaded mayManage={mayManage} workspaceId={workspaceId} />
      ) : (
        <SettingsLoading />
      )}
    </div>
  );
};
