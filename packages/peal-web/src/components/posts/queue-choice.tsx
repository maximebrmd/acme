"use client";

import { useAtomValue } from "@effect/atom-react";
import { DateTime, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTranslations } from "next-intl";
import { queueHorizonDays } from "peal-contract";
import type { Queue, QueuePreview } from "peal-contract";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import type { ReactNode } from "react";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { useTimeOptions } from "#i18n/hour-cycle.ts";
import { queueSlots, workspaceQueues } from "#queues/atoms.ts";
import { defaultQueueOf } from "#queues/slots.ts";

// The composer's other way to say when a post goes out: on the next free
// slot of one of the workspace's queues, which the server decides when
// the post is sent. The view renders each state; `QueueChoice` reads them.

/** Where the composer puts a post in time: a time chosen, or a queue. */
export type Placement =
  | { readonly _tag: "queue"; readonly queueId: string }
  | { readonly _tag: "time" };

/** What the queue choice knows, as far as it was read. */
export type QueueChoiceState =
  | { readonly _tag: "failed" }
  | { readonly _tag: "loading" }
  // The workspace has no queue: the settings page makes one.
  | { readonly _tag: "none" }
  | {
      readonly _tag: "ready";
      // The slot a post added now would take, as far as it was read.
      readonly next: Option.Option<QueuePreview>;
      readonly queueId: string;
      readonly queues: readonly Queue[];
    };

/**
 * The queue picker: the workspace's queues, the default first, and the
 * line saying where a post added now goes, on the queue's clock and in
 * the reader's hour format. With no queue, `settingsLink` says where to
 * make one.
 */
export const QueueChoiceView = ({
  disabled,
  onChange,
  settingsLink,
  state,
}: {
  readonly disabled: boolean;
  readonly onChange: (queueId: string) => void;
  /** A link to the queues' settings page. */
  readonly settingsLink: ReactNode;
  readonly state: QueueChoiceState;
}) => {
  const t = useTranslations("Posts.Composer");
  const format = useFormatter();
  const timeOptions = useTimeOptions();

  if (state._tag === "loading") {
    return <p className="text-muted-foreground text-sm">{t("queueLoading")}</p>;
  }

  if (state._tag === "failed") {
    return <p className="text-sm">{t("queueFailed")}</p>;
  }

  if (state._tag === "none") {
    return (
      <p className="text-muted-foreground text-sm">
        {t("queueNone")} {settingsLink}
      </p>
    );
  }

  const chosen = state.queues.find(({ id }) => id === state.queueId);

  const nameOf = (queue: Queue) =>
    queue.isDefault ? t("queueDefault", { name: queue.name }) : queue.name;

  const line = Option.match(state.next, {
    onNone: () => t("nextFreeLoading"),
    onSome: ({ nextFree, noRoom }) =>
      nextFree === null
        ? t("queueNoRoom", { days: queueHorizonDays, reason: noRoom ?? "full" })
        : t("nextFreeSlot", {
            at: format.dateTime(DateTime.toDate(nextFree), {
              dateStyle: "full",
              timeStyle: "short",
              timeZone: chosen?.timeZone ?? "UTC",
              ...timeOptions,
            }),
            zone: (chosen?.timeZone ?? "UTC").replaceAll("_", " "),
          }),
  });

  return (
    <div className="flex flex-col gap-2">
      <Label id="schedule-queue-label">{t("queueLabel")}</Label>
      <Select
        value={state.queueId}
        disabled={disabled}
        onValueChange={(picked) => {
          if (picked !== null) {
            onChange(picked);
          }
        }}
      >
        <SelectTrigger
          aria-labelledby="schedule-queue-label"
          className="max-w-sm"
        >
          <SelectValue>
            {chosen === undefined ? state.queueId : nameOf(chosen)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {state.queues.map((queue) => (
            <SelectItem key={queue.id} value={queue.id}>
              {nameOf(queue)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {line}
      </p>
    </div>
  );
};

// The picker once a queue is chosen: where a post added now goes, read
// from the queue's preview.
const ChosenQueue = ({
  disabled,
  onChange,
  queueId,
  queues,
  workspaceId,
}: {
  readonly disabled: boolean;
  readonly onChange: (queueId: string) => void;
  readonly queueId: string;
  readonly queues: readonly Queue[];
  readonly workspaceId: string;
}) => {
  const result = useAtomValue(queueSlots(workspaceId, queueId, 1));

  return (
    <QueueChoiceView
      disabled={disabled}
      settingsLink={null}
      state={{
        _tag: "ready",
        next: AsyncResult.isSuccess(result)
          ? Option.some(result.value)
          : Option.none(),
        queueId,
        queues,
      }}
      onChange={onChange}
    />
  );
};

/**
 * The queue picker as the composer shows it, after hydration: the default
 * queue preselected until the member picks another.
 */
export const QueueChoice = ({
  disabled,
  onChange,
  queueId,
  settingsLink,
  workspaceId,
}: {
  readonly disabled: boolean;
  readonly onChange: (queueId: string) => void;
  /** The queue picked, if the member picked one. */
  readonly queueId: string | undefined;
  readonly settingsLink: ReactNode;
  readonly workspaceId: string;
}) => {
  const hydrated = useHydrated();
  const queues = useAtomValue(workspaceQueues(workspaceId));

  const kept = Option.getOrElse(
    AsyncResult.value(queues),
    (): readonly Queue[] => []
  );

  const chosen =
    kept.find(({ id }) => id === queueId) ??
    Option.getOrUndefined(defaultQueueOf(kept));

  const waiting = ((): QueueChoiceState | undefined => {
    if (!hydrated || AsyncResult.isInitial(queues)) {
      return { _tag: "loading" };
    }

    if (AsyncResult.isFailure(queues)) {
      return { _tag: "failed" };
    }

    return chosen === undefined ? { _tag: "none" } : undefined;
  })();

  return waiting === undefined && chosen !== undefined ? (
    <ChosenQueue
      disabled={disabled}
      queueId={chosen.id}
      queues={kept}
      workspaceId={workspaceId}
      onChange={onChange}
    />
  ) : (
    <QueueChoiceView
      disabled={disabled}
      settingsLink={settingsLink}
      state={waiting ?? { _tag: "loading" }}
      onChange={onChange}
    />
  );
};

/**
 * The queue a placement puts a post on, as the picker shows it: the one
 * picked, else the default queue preselected. None until the queues are
 * read, or when the workspace has none.
 */
export const useChosenQueue = (
  workspaceId: string,
  placement: Placement
): Option.Option<string> => {
  const queues = Option.getOrElse(
    AsyncResult.value(useAtomValue(workspaceQueues(workspaceId))),
    (): readonly Queue[] => []
  );

  if (placement._tag !== "queue") {
    return Option.none();
  }

  const picked = queues.find(({ id }) => id === placement.queueId);

  return Option.orElse(Option.fromUndefinedOr(picked?.id), () =>
    defaultQueueOf(queues).pipe(Option.map(({ id }) => id))
  );
};

/** The name of a queue of the workspace, once the queues are read. */
export const useQueueName = (
  workspaceId: string,
  queueId: string
): Option.Option<string> => {
  const queues = Option.getOrElse(
    AsyncResult.value(useAtomValue(workspaceQueues(workspaceId))),
    (): readonly Queue[] => []
  );

  return Option.fromUndefinedOr(queues.find(({ id }) => id === queueId)?.name);
};

/**
 * The queue a post is on, by name, where the post shows; nothing while
 * the queues load, or once the queue is gone.
 */
export const PostQueueLine = ({
  queueId,
  workspaceId,
}: {
  readonly queueId: string | null;
  readonly workspaceId: string;
}) => {
  const tPosts = useTranslations("Posts");
  const name = useQueueName(workspaceId, queueId ?? "");

  return queueId === null || Option.isNone(name) ? null : (
    <p className="text-muted-foreground text-sm">
      {tPosts("queueOf", { name: name.value })}
    </p>
  );
};
