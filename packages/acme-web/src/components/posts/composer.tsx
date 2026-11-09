"use client";

import { PostContentInvalid } from "acme-contract";
import type {
  Channel,
  MediaAttachment,
  Permission,
  Post,
  PostContent,
  PostSchedule,
  PostStatus,
} from "acme-contract";
import { Badge } from "acme-ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "acme-ui/components/card";
import { Separator } from "acme-ui/components/separator";
import { DateTime, Option } from "effect";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ChannelPicker } from "#components/posts/channel-picker.tsx";
import { CharacterCounters } from "#components/posts/character-counters.tsx";
import { ComposerActions } from "#components/posts/composer-actions.tsx";
import type { ComposerAction } from "#components/posts/composer-actions.tsx";
import { ComposerErrors } from "#components/posts/composer-errors.tsx";
import { MediaAttachments } from "#components/posts/media-attachments.tsx";
import {
  instantOfChoice,
  ScheduleFields,
} from "#components/posts/schedule-fields.tsx";
import type { ScheduleChoice } from "#components/posts/schedule-fields.tsx";
import { TargetStatuses } from "#components/posts/target-statuses.tsx";
import { TextTabs } from "#components/posts/text-tabs.tsx";
import { getPathname, useRouter } from "#i18n/navigation.ts";
import { fitOn, fits } from "#posts/character-count.ts";
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
// the channels it goes to, and only when it is not blank.
const contentOf = (
  text: string,
  overrides: Readonly<Record<string, string>>,
  channelIds: readonly string[],
  media: readonly MediaAttachment[]
): PostContent => ({
  media,
  overrides: channelIds.flatMap((channelId) => {
    const own = overrides[channelId] ?? "";

    return own.trim() === "" ? [] : [{ channelId, text: own }];
  }),
  text,
});

/** What the member may do with the post, as it is. */
const capabilitiesOf = (
  permissions: readonly Permission[],
  post: Post | undefined
) => {
  const status = post?.status ?? "draft";
  const can = (permission: Permission) => permissions.includes(permission);

  const canSchedule =
    can("post:schedule") && (status === "draft" || status === "scheduled");

  return {
    canCancel: post !== undefined && canSchedule,
    canReschedule: status === "scheduled" && canSchedule,
    canSchedule,
    canWrite:
      status === "draft" &&
      can(post === undefined ? "post:create" : "post:update"),
    status,
  };
};

type Translate = ReturnType<typeof useTranslations<"Posts.Composer">>;

const titleOf = (t: Translate, post: Post | undefined) => {
  if (post === undefined) {
    return t("newTitle");
  }

  if (post.status === "draft") {
    return t("editTitle");
  }

  return post.status === "scheduled" ? t("scheduledTitle") : t("closedTitle");
};

const noticeOf = (
  t: Translate,
  status: PostStatus,
  { canSchedule, canWrite }: { canSchedule: boolean; canWrite: boolean }
) => {
  if (status === "scheduled") {
    return t("lockedText");
  }

  if (status !== "draft") {
    return t("readOnly");
  }

  if (!canWrite) {
    return t("notAllowed");
  }

  return canSchedule ? null : t("cannotSchedule");
};

const calendarOf = (workspaceId: string, date: ScheduleChoice["date"]) =>
  `/app/${workspaceId}/calendar?date=${dateKey(date)}`;

interface ComposerProps {
  readonly channels: readonly Channel[];
  readonly permissions: readonly Permission[];
  /** None for a new post. */
  readonly post: Post | undefined;
  readonly workspaceId: string;
}

// Writes a post: its text, a text of its own on some channels, where it goes
// and when. A draft is saved as it is; scheduling checks it against each
// platform's limits, which the counters show as the user types. A scheduled
// post keeps its text and can be moved or cancelled.
export const Composer = ({
  channels,
  permissions,
  post,
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

  const [text, setText] = useState(post?.content.text ?? "");
  const [overrides, setOverrides] = useState(() => overridesOf(post));

  const [media, setMedia] = useState<readonly MediaAttachment[]>(
    post?.content.media ?? []
  );

  const [channelIds, setChannelIds] = useState<readonly string[]>(
    post?.targets.map(({ channelId }) => channelId) ?? []
  );

  const [choice, setChoice] = useState<ScheduleChoice>(() =>
    choiceOf(post?.schedule ?? null)
  );

  const { canCancel, canReschedule, canSchedule, canWrite, status } =
    capabilitiesOf(permissions, post);

  const busy = isPending ? action : null;
  const locked = !canWrite || busy !== null;

  const selected = channelIds.flatMap((channelId) =>
    channels.filter(({ id }) => id === channelId)
  );

  const content = contentOf(text, overrides, channelIds, media);

  const channelFits = selected.map((channel) => {
    const own = content.overrides.find(
      ({ channelId }) => channelId === channel.id
    );

    return {
      channel,
      fit: fitOn(channel.platform, own?.text ?? text, media.length),
    };
  });

  const formatted = (at: DateTime.Utc) =>
    format.dateTime(DateTime.toDate(at), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: choice.timeZone,
    });

  // A new post is saved once, then updated. It gets its own address, without
  // leaving the page, so what the composer shows, errors included, stays.
  const [postId, setPostId] = useState(post?.id);

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
    const saved = await requests.save(postId, { channelIds, content });

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

    const saved = await requests.save(postId, { channelIds, content });
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

    toast.success(t("scheduled", { at: formatted(at.value) }));
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

  const work: Record<ComposerAction, () => Promise<void>> = {
    cancel: async () => {
      if (post !== undefined) {
        await cancel(post.id);
      }
    },
    reschedule: async () => {
      if (post !== undefined) {
        await move(post.id);
      }
    },
    save: saveDraft,
    schedule: scheduleDraft,
  };

  const perform = (next: ComposerAction) => {
    setAction(next);
    startTransition(work[next]);
  };

  const notice = noticeOf(t, status, { canSchedule, canWrite });

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
            <TextTabs
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
          <Separator />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">
              {t("mediaLegend")}
            </legend>
            <MediaAttachments
              media={media}
              disabled={locked}
              onChange={setMedia}
            />
          </fieldset>
          <Separator />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">
              {t("scheduleLegend")}
            </legend>
            <ScheduleFields
              value={choice}
              disabled={!canSchedule || busy !== null}
              onChange={setChoice}
            />
          </fieldset>
          {post === undefined || status === "draft" ? null : (
            <TargetStatuses channels={channels} post={post} />
          )}
          <ComposerErrors channels={channels} failure={requests.failure} />
        </div>
      </CardContent>
      <CardFooter>
        <ComposerActions
          busy={busy}
          canSave={canWrite}
          canSchedule={canWrite && canSchedule}
          canReschedule={canReschedule}
          canCancel={canCancel}
          publishable={channelFits.every(({ fit }) => fits(fit))}
          onAction={perform}
        />
      </CardFooter>
    </Card>
  );
};
