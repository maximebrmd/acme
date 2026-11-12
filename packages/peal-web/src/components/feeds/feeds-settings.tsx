"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { defaultFeedTemplate } from "peal-contract";
import type { Channel, Feed, FeedPreview, NewFeed, Queue } from "peal-contract";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "peal-ui/components/alert-dialog";
import { Button } from "peal-ui/components/button";
import { useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { useHydrated } from "#components/media/use-hydrated.ts";
import {
  SettingsLoadFailed,
  SettingsLoading,
} from "#components/settings/settings-status.tsx";
import {
  createFeed,
  deleteFeed,
  feedItems,
  feedsChanged,
  previewFeed,
  updateFeed,
  workspaceFeeds,
} from "#feeds/atoms.ts";
import { feedErrorOf } from "#feeds/feed-error.ts";
import { workspaceChannels } from "#posts/api.ts";
import { workspaceQueues } from "#queues/atoms.ts";

import { useFeedErrorText } from "./feed-error-text.ts";
import {
  FeedFieldsView,
  FeedItemsView,
  FeedItemView,
  FeedPreviewView,
} from "./feed-views.tsx";
import type { FeedDraft } from "./feed-views.tsx";

const emptyDraft: FeedDraft = {
  attachPicture: false,
  channelIds: [],
  mode: "draft",
  queueId: "",
  template: defaultFeedTemplate,
  url: "",
};

// What a change answered: said in a toast, the refusal explained.
const useAnswered = () => {
  const explain = useFeedErrorText();

  return (
    exit: Exit.Exit<unknown, { readonly _tag: string }>,
    done: string
  ): boolean =>
    Option.match(feedErrorOf(exit), {
      onNone: () => {
        toast.success(done);

        return true;
      },
      onSome: (error) => {
        toast.error(explain(error));

        return false;
      },
    });
};

// A feed's newest items, read when asked for.
const Items = ({
  feedId,
  workspaceId,
}: {
  readonly feedId: string;
  readonly workspaceId: string;
}) => {
  const query = feedItems(workspaceId, feedId);
  const result = useAtomValue(query);
  const retry = useAtomRefresh(query);

  if (AsyncResult.isFailure(result)) {
    return <SettingsLoadFailed onRetry={retry} />;
  }

  return AsyncResult.isSuccess(result) ? (
    <FeedItemsView items={result.value.items} />
  ) : (
    <SettingsLoading />
  );
};

// A feed's pause, resume and delete, for those who may change it.
const FeedActions = ({
  feed,
  onItems,
  workspaceId,
}: {
  readonly feed: Feed;
  readonly onItems: () => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Feeds");
  const update = useAtomSet(updateFeed, { mode: "promiseExit" });
  const remove = useAtomSet(deleteFeed, { mode: "promiseExit" });
  const answered = useAnswered();
  const [busy, start] = useTransition();
  const params = { feedId: feed.id, workspaceId };
  const reactivityKeys = feedsChanged(workspaceId);

  return (
    <>
      <Button variant="outline" size="sm" onClick={onItems}>
        {t("showItems")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => {
          start(async () => {
            const status = feed.status === "active" ? "paused" : "active";

            answered(
              await update({ params, payload: { status }, reactivityKeys }),
              status === "paused" ? t("paused") : t("resumed")
            );
          });
        }}
      >
        {feed.status === "active" ? t("pause") : t("resume")}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="outline" size="sm" disabled={busy} />}
        >
          {t("delete")}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                start(async () => {
                  answered(
                    await remove({ params, reactivityKeys }),
                    t("deleted")
                  );
                });
              }}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// A feed of the list, its items shown on demand.
const FeedRow = ({
  feed,
  highlighted,
  mayChange,
  workspaceId,
}: {
  readonly feed: Feed;
  readonly highlighted: boolean;
  readonly mayChange: boolean;
  readonly workspaceId: string;
}) => {
  const [showItems, setShowItems] = useState(highlighted);

  return (
    <FeedItemView
      feed={feed}
      highlighted={highlighted}
      actions={
        mayChange ? (
          <FeedActions
            feed={feed}
            workspaceId={workspaceId}
            onItems={() => {
              setShowItems((shown) => !shown);
            }}
          />
        ) : null
      }
      items={
        showItems ? <Items feedId={feed.id} workspaceId={workspaceId} /> : null
      }
    />
  );
};

// The form that previews an address and adds it as a feed.
const CreateForm = ({
  channels,
  mayQueue,
  queues,
  workspaceId,
}: {
  readonly channels: readonly Channel[];
  readonly mayQueue: boolean;
  readonly queues: readonly Queue[];
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Feeds");
  const create = useAtomSet(createFeed, { mode: "promiseExit" });
  const preview = useAtomSet(previewFeed, { mode: "promiseExit" });
  const answered = useAnswered();
  const explain = useFeedErrorText();
  const [draft, setDraft] = useState(emptyDraft);
  const [read, setRead] = useState<FeedPreview | null>(null);
  const [busy, start] = useTransition();
  const params = { workspaceId };

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: NewFeed = {
      attachPicture: draft.attachPicture,
      channelIds: draft.channelIds,
      mode: draft.mode,
      template: draft.template,
      url: draft.url.trim(),
    };

    // The workspace's default queue is the one a feed names none for.
    const asked: NewFeed =
      draft.mode === "queue" && draft.queueId !== ""
        ? { ...payload, queueId: draft.queueId }
        : payload;

    start(async () => {
      const added = answered(
        await create({
          params,
          payload: asked,
          reactivityKeys: feedsChanged(workspaceId),
        }),
        t("added")
      );

      if (added) {
        setDraft(emptyDraft);
        setRead(null);
      }
    });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <FeedFieldsView
        channels={channels}
        disabled={busy}
        draft={draft}
        mayQueue={mayQueue}
        queues={queues}
        onChange={setDraft}
      />
      {draft.mode === "queue" ? (
        <p className="max-w-xl text-sm">{t("queueWarning")}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy || draft.url.trim() === ""}
          onClick={() => {
            start(async () => {
              const exit = await preview({
                params,
                payload: { template: draft.template, url: draft.url.trim() },
              });

              setRead(Exit.isSuccess(exit) ? exit.value : null);

              const refused = feedErrorOf(exit);

              if (Option.isSome(refused)) {
                toast.error(explain(refused.value));
              }
            });
          }}
        >
          {t("preview")}
        </Button>
        <Button type="submit" disabled={busy || draft.url.trim() === ""}>
          {t("add")}
        </Button>
      </div>
      {read === null ? null : <FeedPreviewView preview={read} />}
    </form>
  );
};

// The page once the workspace's feeds, channels and queues are known.
const Loaded = ({
  highlighted,
  mayChange,
  mayQueue,
  workspaceId,
}: {
  readonly highlighted: string | null;
  readonly mayChange: boolean;
  readonly mayQueue: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Feeds");
  const feedsAtom = workspaceFeeds(workspaceId);
  const channelsAtom = workspaceChannels(workspaceId);
  const feeds = useAtomValue(feedsAtom);
  const channels = useAtomValue(channelsAtom);
  const reloadFeeds = useAtomRefresh(feedsAtom);
  const reloadChannels = useAtomRefresh(channelsAtom);

  // A queue is a choice, not a need: none while they load or cannot be read.
  const queues = Option.getOrElse(
    AsyncResult.value(useAtomValue(workspaceQueues(workspaceId))),
    (): readonly Queue[] => []
  );

  if (AsyncResult.isFailure(feeds) || AsyncResult.isFailure(channels)) {
    return (
      <SettingsLoadFailed
        onRetry={() => {
          reloadFeeds();
          reloadChannels();
        }}
      />
    );
  }

  if (!(AsyncResult.isSuccess(feeds) && AsyncResult.isSuccess(channels))) {
    return <SettingsLoading />;
  }

  return (
    <>
      <section aria-labelledby="feeds-title" className="flex flex-col gap-2">
        <h2 id="feeds-title" className="text-xl font-semibold">
          {t("listTitle")}
        </h2>
        {feeds.value.items.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y">
            {feeds.value.items.map((feed) => (
              <FeedRow
                key={feed.id}
                feed={feed}
                highlighted={feed.id === highlighted}
                mayChange={mayChange}
                workspaceId={workspaceId}
              />
            ))}
          </ul>
        )}
      </section>
      {mayChange ? (
        <section
          aria-labelledby="create-feed-title"
          className="flex flex-col gap-4"
        >
          <h2 id="create-feed-title" className="text-xl font-semibold">
            {t("createTitle")}
          </h2>
          <CreateForm
            channels={channels.value}
            mayQueue={mayQueue}
            queues={queues}
            workspaceId={workspaceId}
          />
        </section>
      ) : null}
    </>
  );
};

/**
 * The workspace's feeds: the list with each feed's state and, on demand,
 * what became of its newest items; for those who may make posts, a form
 * to preview an address and add it, and to pause, resume or delete each.
 */
export const FeedsSettings = (props: {
  readonly highlighted: string | null;
  readonly mayChange: boolean;
  readonly mayQueue: boolean;
  readonly workspaceId: string;
}) => (
  <div className="flex flex-col gap-8">
    {useHydrated() ? <Loaded {...props} /> : <SettingsLoading />}
  </div>
);
