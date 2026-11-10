"use client";

import { DateTime, Option } from "effect";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { PostContentInvalid } from "peal-contract";
import type {
  ApprovalPolicy,
  Channel,
  MediaAttachment,
  Permission,
  Post,
  PostContent,
  PostSchedule,
  PostStatus,
} from "peal-contract";
import { Badge } from "peal-ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import { Separator } from "peal-ui/components/separator";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PostMetrics } from "#components/analytics/post-metrics.tsx";
import { OfferUpgrade } from "#components/billing/offer-upgrade.tsx";
import { AssistantMenu } from "#components/posts/assistant-menu.tsx";
import { ChannelPicker } from "#components/posts/channel-picker.tsx";
import { CharacterCounters } from "#components/posts/character-counters.tsx";
import { ComposerActions } from "#components/posts/composer-actions.tsx";
import type { ComposerAction } from "#components/posts/composer-actions.tsx";
import { ComposerErrors } from "#components/posts/composer-errors.tsx";
import { FollowUpParts } from "#components/posts/follow-up-parts.tsx";
import { MediaAttachments } from "#components/posts/media-attachments.tsx";
import { PostOrigins } from "#components/posts/post-origins.tsx";
import {
  instantOfChoice,
  ScheduleFields,
} from "#components/posts/schedule-fields.tsx";
import type { ScheduleChoice } from "#components/posts/schedule-fields.tsx";
import { TargetOptionsSection } from "#components/posts/target-options-panel.tsx";
import { TargetStatuses } from "#components/posts/target-statuses.tsx";
import { TextTabs } from "#components/posts/text-tabs.tsx";
import { getPathname, useRouter } from "#i18n/navigation.ts";
import { useAttachedMedia } from "#posts/attached-media.ts";
import { connectedTargets } from "#posts/channel-selection.ts";
import { fitOn, fits } from "#posts/character-count.ts";
import { capabilitiesOf } from "#posts/composer-capabilities.ts";
import { mediaFitOn, mediaFits } from "#posts/media-fit.ts";
import { followUpsOf, partsOf, partsTaken, partTextOn } from "#posts/parts.ts";
import type { PartDraft } from "#posts/parts.ts";
import {
  channelOptionsOf,
  initialValues,
  valuesOfPost,
} from "#posts/target-options.ts";
import type { OptionValues, ValuesByChannel } from "#posts/target-options.ts";
import { usePostRequests } from "#posts/use-post-requests.ts";
import {
  browserTimeZone,
  dateKey,
  timeKey,
  wallClockOf,
} from "#posts/zoned-time.ts";

const utcZone = "UTC";

// The next full hour on the zone's clock: where a new post starts.
const nextHour = (timeZone: string): ScheduleChoice =>
  Option.match(
    wallClockOf(DateTime.add(DateTime.nowUnsafe(), { hours: 1 }), timeZone),
    {
      onNone: () => nextHour(utcZone),
      onSome: ({ date, time }) => ({
        date,
        time: timeKey({ hour: time.hour, minute: 0 }),
        timeZone,
      }),
    }
  );

// A scheduled post's time, on the clock of the zone it was scheduled in.
const choiceOf = (schedule: PostSchedule | null): ScheduleChoice =>
  schedule === null
    ? nextHour(browserTimeZone())
    : Option.match(wallClockOf(schedule.at, schedule.timeZone), {
        onNone: () => nextHour(browserTimeZone()),
        onSome: ({ date, time }) => ({
          date,
          time: timeKey(time),
          timeZone: schedule.timeZone,
        }),
      });

const overridesOf = (post: Post | undefined): Record<string, string> =>
  Object.fromEntries(
    (post?.content.overrides ?? []).map(({ channelId, text }) => [
      channelId,
      text,
    ])
  );

// The overrides with the channel's own text, or without it.
const withOverride = (
  overrides: Readonly<Record<string, string>>,
  channelId: string,
  own: string | undefined
): Record<string, string> => {
  const others = Object.entries(overrides).filter(([id]) => id !== channelId);

  const entry: [string, string][] = own === undefined ? [] : [[channelId, own]];

  return Object.fromEntries([...others, ...entry]);
};

// What the post says, from the composer's fields: a text of its own only for
// the channels it goes to, and only when it is not blank, then the parts
// that follow it.
const contentOf = (
  text: string,
  overrides: Readonly<Record<string, string>>,
  channelIds: readonly string[],
  media: readonly MediaAttachment[],
  parts: readonly PartDraft[]
): PostContent => ({
  followUps: followUpsOf(parts, channelIds),
  media,
  overrides: channelIds.flatMap((channelId) => {
    const own = overrides[channelId] ?? "";

    return own.trim() === "" ? [] : [{ channelId, text: own }];
  }),
  text,
});

type Translate = ReturnType<typeof useTranslations<"Posts.Composer">>;

const titleOf = (t: Translate, post: Post | undefined) => {
  if (post === undefined) {
    return t("newTitle");
  }

  if (post.status === "draft") {
    return t("editTitle");
  }

  if (post.status === "awaitingApproval") {
    return t("awaitingTitle");
  }

  return post.status === "scheduled" ? t("scheduledTitle") : t("closedTitle");
};

const noticeOf = (
  t: Translate,
  status: PostStatus,
  {
    canSchedule,
    canWrite,
    willWait,
  }: { canSchedule: boolean; canWrite: boolean; willWait: boolean }
) => {
  if (status === "awaitingApproval") {
    return t("awaitingText");
  }

  if (status === "scheduled") {
    return t("lockedText");
  }

  if (status !== "draft") {
    return t("readOnly");
  }

  if (!canWrite) {
    return t("notAllowed");
  }

  if (!canSchedule) {
    return t("cannotSchedule");
  }

  return willWait ? t("willWait") : null;
};

const calendarOf = (workspaceId: string, date: ScheduleChoice["date"]) =>
  `/app/${workspaceId}/calendar?date=${dateKey(date)}`;

// What the composer starts with: the post's, or nothing for a new one.
const startOf = (post: Post | undefined) => ({
  media: post?.content.media ?? [],
  schedule: post?.schedule ?? null,
  text: post?.content.text ?? "",
});

interface ComposerProps {
  /** Which of the workspace's posts wait for an approval. */
  readonly approvalPolicy: ApprovalPolicy;
  readonly channels: readonly Channel[];
  readonly permissions: readonly Permission[];
  /** None for a new post. */
  readonly post: Post | undefined;
  /** The signed-in user. */
  readonly userId: string;
  readonly workspaceId: string;
}

// Writes a post: its text, a text of its own on some channels, its images
// and videos, the parts that follow it in a thread, the options of the
// channels whose platform takes some, where it goes and when. A draft is saved as it is, or discarded; scheduling
// checks it against each platform's limits, which the counters show as the
// user types, and the options each platform needs, which the options fields
// show once scheduling refused them. A scheduled post keeps its text and
// options, and can be moved, cancelled, or taken back to draft to change
// them.
export const Composer = ({
  approvalPolicy,
  channels,
  permissions,
  post,
  userId,
  workspaceId,
}: ComposerProps) => {
  const t = useTranslations("Posts.Composer");
  const tPosts = useTranslations("Posts");
  const format = useFormatter();
  const router = useRouter();
  const locale = useLocale();
  const requests = usePostRequests(workspaceId);
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<ComposerAction | null>(null);

  const start = startOf(post);
  const [text, setText] = useState(start.text);
  // Counts the texts accepted from the assistant: each starts fresh editors.
  const [accepted, setAccepted] = useState(0);
  const [overrides, setOverrides] = useState(() => overridesOf(post));

  // The options each channel's fields hold, by channel.
  const [optionValues, setOptionValues] = useState<ValuesByChannel>(() =>
    valuesOfPost(post, (channelId) =>
      Option.fromUndefinedOr(
        channels.find(({ id }) => id === channelId)?.platform
      )
    )
  );

  const [media, setMedia] = useState<readonly MediaAttachment[]>(start.media);

  // The parts that follow the post, in order.
  const [parts, setParts] = useState<readonly PartDraft[]>(() =>
    partsOf(post?.content)
  );

  const [channelIds, setChannelIds] = useState<readonly string[]>(() =>
    connectedTargets(post, channels)
  );

  const [choice, setChoice] = useState<ScheduleChoice>(() =>
    choiceOf(start.schedule)
  );

  // A new post is saved once, then updated. It gets its own address, without
  // leaving the page, so what the composer shows, errors included, stays.
  const [postId, setPostId] = useState(post?.id);

  const {
    canCancel,
    canDiscard,
    canReschedule,
    canSchedule,
    canUnschedule,
    canWrite,
    status,
    willWait,
  } = capabilitiesOf({
    approvalPolicy,
    permissions,
    post,
    saved: postId !== undefined,
    userId,
  });

  const busy = isPending ? action : null;
  const locked = !canWrite || busy !== null;

  const selected = channelIds.flatMap((channelId) =>
    channels.filter(({ id }) => id === channelId)
  );

  const content = contentOf(text, overrides, channelIds, media, parts);
  const options = channelOptionsOf(selected, optionValues);
  const attached = useAttachedMedia(workspaceId, media);

  const valuesOn = (channel: Channel): OptionValues =>
    optionValues[channel.id] ?? initialValues(channel.platform);

  const channelFits = selected.map((channel) => {
    const own = content.overrides.find(
      ({ channelId }) => channelId === channel.id
    );

    return {
      channel,
      fit: fitOn(channel.platform, own?.text ?? text, media.length),
      media: mediaFitOn(channel.platform, attached),
    };
  });

  // Whether every channel takes the parts that follow: their number, and
  // each one's text, as the server will check them. Their images and
  // videos are checked where they are shown, and again by the server.
  const partsFit = selected.every(
    ({ id, platform }) =>
      partsTaken(platform, parts.length)._tag === "taken" &&
      parts.every((part) =>
        fits(fitOn(platform, partTextOn(part, id), part.media.length))
      )
  );

  const formatted = (at: DateTime.Utc) =>
    format.dateTime(DateTime.toDate(at), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: choice.timeZone,
    });

  const opened = (saved: Post) => {
    if (postId === undefined) {
      setPostId(saved.id);
      window.history.replaceState(
        null,
        "",
        getPathname({
          href: `/app/${workspaceId}/posts/${saved.id}`,
          locale,
        })
      );
    }
  };

  const saveDraft = async () => {
    const saved = await requests.save(postId, {
      channelIds,
      content,
      options,
    });

    if (Option.isSome(saved)) {
      toast.success(t("saved"));
      opened(saved.value);
    }
  };

  const scheduleDraft = async () => {
    const at = instantOfChoice(choice);

    if (Option.isNone(at)) {
      requests.fail({ _tag: "InvalidTime" });

      return;
    }

    const saved = await requests.save(postId, {
      channelIds,
      content,
      options,
    });

    const [first, ...rest] = channelIds;

    if (Option.isNone(saved)) {
      return;
    }

    if (first === undefined) {
      requests.fail(
        new PostContentInvalid({ violations: [{ _tag: "noChannels" }] })
      );
      opened(saved.value);

      return;
    }

    const scheduled = await requests.schedule(saved.value.id, {
      at: at.value,
      channelIds: [first, ...rest],
      timeZone: choice.timeZone,
    });

    if (Option.isNone(scheduled)) {
      opened(saved.value);

      return;
    }

    toast.success(
      t(
        scheduled.value.status === "awaitingApproval"
          ? "sentForApproval"
          : "scheduled",
        { at: formatted(at.value) }
      )
    );
    router.push(calendarOf(workspaceId, choice.date));
  };

  const move = async (id: string) => {
    const at = instantOfChoice(choice);

    if (Option.isNone(at)) {
      requests.fail({ _tag: "InvalidTime" });

      return;
    }

    const moved = await requests.reschedule(id, {
      at: at.value,
      timeZone: choice.timeZone,
    });

    if (Option.isSome(moved)) {
      toast.success(t("rescheduled", { at: formatted(at.value) }));
    }
  };

  const cancel = async (id: string) => {
    const cancelled = await requests.cancel(id);

    if (Option.isSome(cancelled)) {
      toast.success(t("cancelled"));
      router.push(calendarOf(workspaceId, choice.date));
    }
  };

  const unschedule = async (id: string) => {
    const draft = await requests.unschedule(id);

    if (Option.isSome(draft)) {
      toast.success(t("unscheduled"));
    }
  };

  const discard = async (id: string) => {
    if (await requests.discard(id)) {
      toast.success(t("discarded"));
      router.push(`/app/${workspaceId}/drafts`);
    }
  };

  const work: Record<ComposerAction, () => Promise<void>> = {
    cancel: async () => {
      if (post !== undefined) {
        await cancel(post.id);
      }
    },
    discard: async () => {
      if (postId !== undefined) {
        await discard(postId);
      }
    },
    reschedule: async () => {
      if (post !== undefined) {
        await move(post.id);
      }
    },
    save: saveDraft,
    schedule: scheduleDraft,
    unschedule: async () => {
      if (post !== undefined) {
        await unschedule(post.id);
      }
    },
  };

  const perform = (next: ComposerAction) => {
    setAction(next);
    startTransition(work[next]);
  };

  const notice = noticeOf(t, status, { canSchedule, canWrite, willWait });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-2xl font-semibold tracking-tight">
            {titleOf(t, post)}
          </h1>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        {post === undefined ? null : (
          <div className="flex gap-2">
            <Badge variant="outline">{tPosts("status", { status })}</Badge>
            {post.outcome === null ? null : (
              <Badge variant="secondary">
                {tPosts("outcome", { outcome: post.outcome })}
              </Badge>
            )}
          </div>
        )}
        {post === undefined ? null : (
          <PostOrigins post={post} viewerId={userId} />
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {notice === null ? null : (
            <p className="text-muted-foreground text-sm">{notice}</p>
          )}
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">
              {t("channelsLegend")}
            </legend>
            <ChannelPicker
              channels={channels}
              selected={channelIds}
              disabled={locked}
              onChange={setChannelIds}
            />
          </fieldset>
          <Separator />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">
              {t("textLegend")}
            </legend>
            <AssistantMenu
              disabled={locked}
              permissions={permissions}
              platforms={selected.map(({ platform }) => platform)}
              text={text}
              workspaceId={workspaceId}
              onAccept={(suggested) => {
                setText(suggested);
                setAccepted((count) => count + 1);
              }}
            />
            <TextTabs
              key={accepted}
              selected={selected}
              text={text}
              overrides={overrides}
              readOnly={locked}
              onText={setText}
              onOverride={(channelId, own) => {
                setOverrides((current) =>
                  withOverride(current, channelId, own)
                );
              }}
            />
          </fieldset>
          <section
            aria-labelledby="counters-title"
            className="flex flex-col gap-3"
          >
            <h2 id="counters-title" className="text-sm font-medium">
              {t("countersLegend")}
            </h2>
            <CharacterCounters fits={channelFits} />
          </section>
          <TargetOptionsSection
            channels={selected}
            disabled={locked}
            photos={
              attached.length > 0 &&
              attached.every(({ media: found }) =>
                Option.exists(found, ({ kind }) => kind === "image")
              )
            }
            workspaceId={workspaceId}
            failure={requests.failure}
            valuesOf={valuesOn}
            onChange={(channelId, values) => {
              setOptionValues((current) => ({
                ...current,
                [channelId]: values,
              }));
            }}
          />
          <Separator />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">
              {t("mediaLegend")}
            </legend>
            <MediaAttachments
              attached={attached}
              canBrowse={permissions.includes("media:read")}
              canUpload={permissions.includes("media:upload")}
              disabled={locked}
              editable={canWrite}
              platforms={selected.map(({ platform }) => platform)}
              workspaceId={workspaceId}
              onChange={setMedia}
            />
          </fieldset>
          <Separator />
          <FollowUpParts
            disabled={locked}
            editable={canWrite}
            parts={parts}
            permissions={permissions}
            selected={selected}
            workspaceId={workspaceId}
            onChange={setParts}
          />
          <Separator />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">
              {t("scheduleLegend")}
            </legend>
            <ScheduleFields
              value={choice}
              disabled={!(canSchedule || canReschedule) || busy !== null}
              onChange={setChoice}
            />
          </fieldset>
          {post === undefined || status === "draft" ? null : (
            <TargetStatuses channels={channels} post={post} />
          )}
          {post !== undefined &&
          permissions.includes("analytics:read") &&
          post.targets.some((target) => target.status === "published") ? (
            <PostMetrics
              channels={channels}
              post={post}
              workspaceId={workspaceId}
            />
          ) : null}
          <ComposerErrors
            channels={channels}
            failure={requests.failure}
            media={attached}
          />
          <OfferUpgrade failure={requests.failure} />
        </div>
      </CardContent>
      <CardFooter>
        <ComposerActions
          busy={busy}
          canSave={canWrite}
          canSchedule={canWrite && canSchedule}
          canReschedule={canReschedule}
          canUnschedule={canUnschedule}
          willWait={willWait}
          canDiscard={canDiscard}
          canCancel={canCancel}
          publishable={
            channelFits.every(
              ({ fit, media: mediaFit }) => fits(fit) && mediaFits(mediaFit)
            ) && partsFit
          }
          onAction={perform}
        />
      </CardFooter>
    </Card>
  );
};
