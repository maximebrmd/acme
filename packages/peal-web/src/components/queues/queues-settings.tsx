"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { Channel, ChannelSet, Queue } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { useId, useMemo, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { workspaceChannelSets } from "#channel-sets/atoms.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { DeleteSavedItem } from "#components/settings/delete-saved-item.tsx";
import {
  SettingsLoadFailed,
  SettingsLoading,
} from "#components/settings/settings-status.tsx";
import { workspaceChannels } from "#posts/api.ts";
import { browserTimeZone, timeZoneChoices } from "#posts/zoned-time.ts";
import {
  createQueue,
  deleteQueue,
  queueSlots,
  queuesChanged,
  updateQueue,
  workspaceQueues,
} from "#queues/atoms.ts";
import { queueDetailsOf, queueDraftOf } from "#queues/slots.ts";
import type { QueueDraft } from "#queues/slots.ts";
import { savedItemErrorOf } from "#settings/saved-item-error.ts";
import type { SavedItemError } from "#settings/saved-item-error.ts";

import {
  QueueFieldsView,
  QueueItemView,
  UpcomingSlotsView,
} from "./queue-views.tsx";
import type { UpcomingSlots } from "./queue-views.tsx";

// Every zone to choose from, the browser's and the queue's first.
const useZones = (zone: string) =>
  useMemo(() => timeZoneChoices(browserTimeZone(), zone), [zone]);

// A queue's coming slots, read once the page has hydrated.
const Upcoming = ({
  queue,
  workspaceId,
}: {
  readonly queue: Queue;
  readonly workspaceId: string;
}) => {
  const result = useAtomValue(queueSlots(workspaceId, queue.id));

  const upcoming = ((): UpcomingSlots => {
    if (AsyncResult.isSuccess(result)) {
      return { _tag: "loaded", preview: result.value };
    }

    return AsyncResult.isFailure(result)
      ? { _tag: "failed" }
      : { _tag: "loading" };
  })();

  return <UpcomingSlotsView timeZone={queue.timeZone} upcoming={upcoming} />;
};

// A queue's form: everything it holds, saved together.
const EditForm = ({
  channelSets,
  channels,
  onClose,
  queue,
  workspaceId,
}: {
  readonly channelSets: readonly ChannelSet[];
  readonly channels: readonly Channel[];
  readonly onClose: () => void;
  readonly queue: Queue;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Queues");
  const settings = useTranslations("Settings");
  const update = useAtomSet(updateQueue, { mode: "promiseExit" });
  const [error, setError] = useState<SavedItemError | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<QueueDraft>(() => queueDraftOf(queue));
  const zones = useZones(queue.timeZone);
  const details = queueDetailsOf(draft);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Option.isNone(details)) {
      return;
    }

    startTransition(async () => {
      const exit = await update({
        params: { queueId: queue.id, workspaceId },
        payload: details.value,
        reactivityKeys: queuesChanged(workspaceId),
      });

      Option.match(savedItemErrorOf(exit, true), {
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
      <QueueFieldsView
        channelSets={channelSets}
        channels={channels}
        draft={draft}
        dropped={queue.unavailableChannelIds.length}
        error={error}
        disabled={isPending}
        idPrefix={queue.id}
        zones={zones}
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

// One queue, with its form once the member opened it.
const QueueRow = ({
  channelSets,
  channels,
  mayManage,
  queue,
  workspaceId,
}: {
  readonly channelSets: readonly ChannelSet[];
  readonly channels: readonly Channel[];
  readonly mayManage: boolean;
  readonly queue: Queue;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Queues");
  const nameId = useId();
  const remove = useAtomSet(deleteQueue, { mode: "promiseExit" });
  const [editing, setEditing] = useState(false);

  const actions = mayManage ? (
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
        kind="queue"
        title={t("deleteTitle", { name: queue.name })}
        description={t("deleteDescription")}
        deleted={t("deleted")}
        remove={async () =>
          await remove({
            params: { queueId: queue.id, workspaceId },
            reactivityKeys: queuesChanged(workspaceId),
          })
        }
      />
    </>
  ) : undefined;

  return (
    <QueueItemView
      channels={channels}
      queue={queue}
      nameId={nameId}
      upcoming={<Upcoming queue={queue} workspaceId={workspaceId} />}
      actions={actions}
    >
      {editing ? (
        <EditForm
          channelSets={channelSets}
          channels={channels}
          queue={queue}
          workspaceId={workspaceId}
          onClose={() => {
            setEditing(false);
          }}
        />
      ) : null}
    </QueueItemView>
  );
};

const emptyDraft = (timeZone: string): QueueDraft => ({
  channelIds: [],
  channelSetId: "",
  isDefault: false,
  name: "",
  slots: [],
  timeZone,
});

// A new queue: a name, a zone (the browser's to start with), its slots and
// channels.
const CreateForm = ({
  channelSets,
  channels,
  workspaceId,
}: {
  readonly channelSets: readonly ChannelSet[];
  readonly channels: readonly Channel[];
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Queues");
  const create = useAtomSet(createQueue, { mode: "promiseExit" });
  const [error, setError] = useState<SavedItemError | null>(null);
  const [isPending, startTransition] = useTransition();

  const [draft, setDraft] = useState<QueueDraft>(() =>
    emptyDraft(browserTimeZone())
  );

  const zones = useZones(draft.timeZone);
  const details = queueDetailsOf(draft);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Option.isNone(details)) {
      return;
    }

    startTransition(async () => {
      const exit = await create({
        params: { workspaceId },
        payload: details.value,
        reactivityKeys: queuesChanged(workspaceId),
      });

      if (Exit.isSuccess(exit)) {
        setError(null);
        setDraft(emptyDraft(draft.timeZone));
        toast.success(t("created"));
      } else {
        setError(
          Option.getOrElse(
            savedItemErrorOf(exit, true),
            (): SavedItemError => ({
              key: "unknown",
            })
          )
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <QueueFieldsView
        channelSets={channelSets}
        channels={channels}
        draft={draft}
        dropped={0}
        error={error}
        disabled={isPending}
        idPrefix="new"
        zones={zones}
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

// The page once the workspace's queues, channels and sets are known.
const Loaded = ({
  mayManage,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Queues");
  const queuesAtom = workspaceQueues(workspaceId);
  const channelsAtom = workspaceChannels(workspaceId);
  const queues = useAtomValue(queuesAtom);
  const channels = useAtomValue(channelsAtom);
  const reloadQueues = useAtomRefresh(queuesAtom);
  const reloadChannels = useAtomRefresh(channelsAtom);

  // A set is a choice, not a need: none while they load or cannot be read.
  const channelSets = Option.getOrElse(
    AsyncResult.value(useAtomValue(workspaceChannelSets(workspaceId))),
    (): readonly ChannelSet[] => []
  );

  if (AsyncResult.isFailure(queues) || AsyncResult.isFailure(channels)) {
    return (
      <SettingsLoadFailed
        onRetry={() => {
          reloadQueues();
          reloadChannels();
        }}
      />
    );
  }

  if (!(AsyncResult.isSuccess(queues) && AsyncResult.isSuccess(channels))) {
    return <SettingsLoading />;
  }

  return (
    <>
      <section aria-labelledby="queues-title" className="flex flex-col gap-2">
        <h2 id="queues-title" className="text-xl font-semibold">
          {t("listTitle")}
        </h2>
        {queues.value.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y">
            {queues.value.map((queue) => (
              <QueueRow
                key={queue.id}
                channelSets={channelSets}
                channels={channels.value}
                mayManage={mayManage}
                queue={queue}
                workspaceId={workspaceId}
              />
            ))}
          </ul>
        )}
      </section>
      {mayManage ? (
        <section
          aria-labelledby="create-queue-title"
          className="flex flex-col gap-4"
        >
          <h2 id="create-queue-title" className="text-xl font-semibold">
            {t("createTitle")}
          </h2>
          <CreateForm
            channelSets={channelSets}
            channels={channels.value}
            workspaceId={workspaceId}
          />
        </section>
      ) : null}
    </>
  );
};

/**
 * The workspace's queues: the list with each queue's coming slots, and
 * for those who may change posts a form to add one, and to change or
 * delete each.
 */
export const QueuesSettings = ({
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
