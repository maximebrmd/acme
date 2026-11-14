"use client";

import { useAtomSet } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { useTranslations } from "next-intl";
import type { Article, Channel } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
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
import { toast } from "sonner";

import {
  articlesKeys,
  createArticle,
  deleteArticle,
  retryArticle,
  scheduleArticle,
  unpublishArticle,
  unscheduleArticle,
  updateArticle,
  updateArticleOnSite,
} from "#articles/api.ts";
import {
  articleFailureOf,
  draftOf,
  errorTagOf,
  inputOf,
  timeInputOf,
} from "#articles/article-draft.ts";
import type { ArticleDraft, ArticleFailure } from "#articles/article-draft.ts";
import { ArticleFields } from "#components/articles/article-fields.tsx";
import { useRouter } from "#i18n/navigation.ts";
import { browserTimeZone } from "#posts/zoned-time.ts";

const FailureAlert = ({ failure }: { readonly failure: ArticleFailure }) => {
  const t = useTranslations("Articles.editor");

  return (
    <Alert variant="destructive">
      <AlertDescription>
        {failure.violations === undefined
          ? t(`errors.${errorTagOf(failure)}`, { code: failure.code ?? "" })
          : failure.violations
              .map((violation) => t(`violations.${violation._tag}`))
              .join(" ")}
      </AlertDescription>
    </Alert>
  );
};

const Unpublish = ({
  disabled,
  onConfirm,
}: {
  readonly disabled: boolean;
  readonly onConfirm: () => void;
}) => {
  const t = useTranslations("Articles.editor");

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button type="button" variant="outline" disabled={disabled} />}
      >
        {t("unpublish")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("unpublishTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("unpublishDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t("unpublish")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/** Where the article stands, as the editor reads it. */
const standingOf = (article: Article | undefined) => {
  const state = article?.state;
  const tag = state?._tag ?? "draft";
  const removed = state?._tag === "published" && state.removedAt !== null;

  return {
    editable: tag === "draft" || tag === "scheduled" || tag === "failed",
    onSite: tag === "published" && !removed,
    retriable: tag === "failed" || tag === "unconfirmed",
    tag,
  };
};

// What the editor tells once a request worked.
type Done =
  | "deleted"
  | "saved"
  | "scheduled"
  | "unpublished"
  | "unscheduled"
  | "updatedOnSite";

// The requests the editor makes, each telling how it ended.
const useArticleRequests = (workspaceId: string) => {
  const t = useTranslations("Articles.editor");
  const router = useRouter();
  const [failure, setFailure] = useState<ArticleFailure | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = <A, E>(
    request: () => Promise<Exit.Exit<A, E>>,
    done: Done,
    after?: (value: A) => void
  ) => {
    setFailure(null);

    startTransition(async () => {
      const exit = await request();

      Option.match(articleFailureOf(exit), {
        onNone: () => {
          toast.success(t(done));

          if (Exit.isSuccess(exit)) {
            after?.(exit.value);
          }
        },
        onSome: setFailure,
      });
    });
  };

  const goTo = (path: string) => {
    router.push(`/app/${workspaceId}/articles${path}`);
  };

  return { failure, goTo, isPending, run };
};

type Standing = ReturnType<typeof standingOf>;

interface PealHandlers {
  readonly handleDelete: () => void;
  readonly handleRetry: () => void;
  readonly handleSave: () => void;
  readonly handleSend: () => void;
  readonly handleUnschedule: () => void;
}

// What may be done while the article is Peal's: saved, sent, taken back,
// sent again, deleted.
const PealActions = ({
  disabled,
  handlers,
  isNew,
  may,
  sendsNow,
  standing,
}: {
  readonly disabled: boolean;
  readonly handlers: PealHandlers;
  readonly isNew: boolean;
  readonly may: (permission: string) => boolean;
  readonly sendsNow: boolean;
  readonly standing: Standing;
}) => {
  const t = useTranslations("Articles.editor");
  const schedules = may("post:schedule");

  return (
    <>
      {standing.editable && may("post:update") ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={handlers.handleSave}
        >
          {t("save")}
        </Button>
      ) : null}
      {standing.editable && schedules ? (
        <Button type="button" disabled={disabled} onClick={handlers.handleSend}>
          {sendsNow ? t("sendNow") : t("schedule")}
        </Button>
      ) : null}
      {standing.tag === "scheduled" && schedules ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={handlers.handleUnschedule}
        >
          {t("unschedule")}
        </Button>
      ) : null}
      {standing.retriable && schedules ? (
        <Button
          type="button"
          disabled={disabled}
          onClick={handlers.handleRetry}
        >
          {t("retry")}
        </Button>
      ) : null}
      {!isNew && standing.tag !== "publishing" && may("post:delete") ? (
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={handlers.handleDelete}
        >
          {t("delete")}
        </Button>
      ) : null}
    </>
  );
};

// What may be done once the article is on its site.
const SiteActions = ({
  disabled,
  onUnpublish,
  onUpdate,
}: {
  readonly disabled: boolean;
  readonly onUnpublish: () => void;
  readonly onUpdate: () => void;
}) => {
  const t = useTranslations("Articles.editor");

  return (
    <>
      <Button type="button" disabled={disabled} onClick={onUpdate}>
        {t("updateOnSite")}
      </Button>
      <Unpublish disabled={disabled} onConfirm={onUnpublish} />
    </>
  );
};

interface ArticleEditorProps {
  readonly article?: Article;
  readonly permissions: readonly string[];
  readonly sites: readonly Channel[];
  readonly workspaceId: string;
}

/**
 * Writes an article for one of the workspace's websites, then does what
 * follows where it stands: saved and scheduled while it is Peal's, sent
 * again once it failed, updated or moved to the trash on the site once
 * it is there.
 */
export const ArticleEditor = ({
  article,
  permissions,
  sites,
  workspaceId,
}: ArticleEditorProps) => {
  const t = useTranslations("Articles.editor");
  const timeZone = browserTimeZone();

  const [draft, setDraft] = useState<ArticleDraft>(() =>
    draftOf(article, sites[0]?.id ?? "", timeZone)
  );

  const { failure, goTo, isPending, run } = useArticleRequests(workspaceId);

  const keys = articlesKeys(workspaceId);
  const params = { articleId: article?.id ?? "", workspaceId };
  const standing = standingOf(article);
  const may = (permission: string) => permissions.includes(permission);

  const create = useAtomSet(createArticle, { mode: "promiseExit" });
  const update = useAtomSet(updateArticle, { mode: "promiseExit" });
  const remove = useAtomSet(deleteArticle, { mode: "promiseExit" });
  const schedule = useAtomSet(scheduleArticle, { mode: "promiseExit" });
  const unschedule = useAtomSet(unscheduleArticle, { mode: "promiseExit" });
  const retry = useAtomSet(retryArticle, { mode: "promiseExit" });
  const unpublish = useAtomSet(unpublishArticle, { mode: "promiseExit" });

  const updateOnSite = useAtomSet(updateArticleOnSite, {
    mode: "promiseExit",
  });

  const handleChange = (change: Partial<ArticleDraft>) => {
    setDraft((current) => ({ ...current, ...change }));
  };

  // A new article opens at its own address once made.
  const opened = (made: Article) => {
    if (article === undefined) {
      goTo(`/${made.id}`);
    }
  };

  const saved = async () =>
    article === undefined
      ? await create({
          params: { workspaceId },
          payload: { ...inputOf(draft), channelId: draft.channelId },
          reactivityKeys: keys,
        })
      : await update({ params, payload: inputOf(draft), reactivityKeys: keys });

  const handleSave = () => {
    run(saved, "saved", opened);
  };

  const handleSend = () => {
    run(
      async () => {
        if (article === undefined) {
          return await create({
            params: { workspaceId },
            payload: {
              ...inputOf(draft),
              channelId: draft.channelId,
              schedule: timeInputOf(draft, timeZone),
            },
            reactivityKeys: keys,
          });
        }

        const written = await saved();

        return Exit.isSuccess(written)
          ? await schedule({
              params,
              payload: timeInputOf(draft, timeZone),
              reactivityKeys: keys,
            })
          : written;
      },
      "scheduled",
      opened
    );
  };

  const readOnly = standing.onSite
    ? !may("post:publish")
    : !standing.editable || !may("post:update");

  const sendsNow = draft.time === "" || draft.siteStatus === "future";

  return (
    <div className="flex flex-col gap-6">
      {failure === null ? null : <FailureAlert failure={failure} />}
      <ArticleFields
        choosesSite={article === undefined}
        draft={draft}
        onChange={handleChange}
        readOnly={readOnly}
        schedules={standing.editable}
        sites={sites}
        timeZone={timeZone}
        workspaceId={workspaceId}
      />
      <div className="flex flex-wrap gap-2">
        <PealActions
          disabled={isPending}
          handlers={{
            handleDelete: () => {
              run(
                async () => await remove({ params, reactivityKeys: keys }),
                "deleted",
                () => {
                  goTo("");
                }
              );
            },
            handleRetry: () => {
              run(
                async () => await retry({ params, reactivityKeys: keys }),
                "scheduled"
              );
            },
            handleSave,
            handleSend,
            handleUnschedule: () => {
              run(
                async () => await unschedule({ params, reactivityKeys: keys }),
                "unscheduled"
              );
            },
          }}
          isNew={article === undefined}
          may={may}
          sendsNow={sendsNow}
          standing={standing}
        />
        {standing.onSite && may("post:publish") ? (
          <SiteActions
            disabled={isPending}
            onUnpublish={() => {
              run(
                async () => await unpublish({ params, reactivityKeys: keys }),
                "unpublished"
              );
            }}
            onUpdate={() => {
              run(
                async () =>
                  await updateOnSite({
                    params,
                    payload: inputOf(draft),
                    reactivityKeys: keys,
                  }),
                "updatedOnSite"
              );
            }}
          />
        ) : null}
      </div>
      {article?.state._tag === "published" &&
      article.state.permalink !== null ? (
        <p className="text-muted-foreground text-sm">
          {t("permalink")}{" "}
          <a
            href={article.state.permalink}
            className="underline"
            target="_blank"
            rel="noreferrer noopener"
          >
            {article.state.permalink}
          </a>
        </p>
      ) : null}
    </div>
  );
};
