"use client";

import { RegistryContext, useAtomSet, useAtomValue } from "@effect/atom-react";
import { MediaContentTypeSchema } from "acme-contract";
import { Button } from "acme-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "acme-ui/components/card";
import { Label } from "acme-ui/components/label";
import { Progress } from "acme-ui/components/progress";
import { Textarea } from "acme-ui/components/textarea";
import { Cause, Option } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";
import { UploadIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import {
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import type { ChangeEvent } from "react";

import { describeUpload, upload, uploadProgress } from "#media/atoms.ts";
import { UploadFailed } from "#media/upload-failed.ts";

import { useFileSize } from "./use-file-size.ts";

// What the file picker offers: the content types the API takes.
const accept = MediaContentTypeSchema.literals.join(",");

// The longest description the API keeps.
const maxAltTextLength = 2000;

const mebibyte = 1024 * 1024;

interface Entry {
  readonly file: File;
  readonly id: string;
  // Lets the upload's atoms go once the entry leaves the list.
  readonly release: () => void;
}

type Outcome =
  | { readonly _tag: "running" }
  | { readonly _tag: "done" }
  | { readonly _tag: "canceled" }
  | { readonly _tag: "failed"; readonly failure: UploadFailed };

const outcomeOf = (
  result: AsyncResult.AsyncResult<unknown, UploadFailed>
): Outcome => {
  // A run started again keeps the last result, waiting.
  if (result.waiting) {
    return { _tag: "running" };
  }

  if (AsyncResult.isSuccess(result)) {
    return { _tag: "done" };
  }

  if (AsyncResult.isFailure(result)) {
    if (Cause.hasInterruptsOnly(result.cause)) {
      return { _tag: "canceled" };
    }

    const failure = Cause.findErrorOption(result.cause).pipe(
      Option.getOrElse(() => new UploadFailed({ reason: "unexpected" }))
    );

    return { _tag: "failed", failure };
  }

  return { _tag: "running" };
};

const useErrorMessage = () => {
  const t = useTranslations("Media.uploader.errors");

  return ({ limit, reason }: UploadFailed): string => {
    // The limit in mebibytes, for a file too large for its kind.
    if (reason === "tooLarge") {
      return t(reason, { limit: Math.round((limit ?? 0) / mebibyte) });
    }

    if (reason === "altTextTooLong") {
      return t(reason, { limit: limit ?? maxAltTextLength });
    }

    return t(reason);
  };
};

type Saving = "idle" | "saving" | "saved" | "failed";

interface Description {
  // As typed.
  readonly text: string;
  // As the media holds it.
  readonly saved: string;
  readonly saving: Saving;
}

// The description of the media an upload made, saved when the field loses
// focus with a change.
const AltTextField = ({
  description,
  entryId,
  mediaId,
  onChange,
  workspaceId,
}: {
  readonly description: Description;
  readonly entryId: string;
  readonly mediaId: Option.Option<string>;
  readonly onChange: (description: Description) => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Media.uploader");
  const id = useId();
  const describe = useAtomSet(describeUpload(entryId), { mode: "promiseExit" });
  const { saving, text } = description;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...description, text: event.target.value });
  };

  const [, startTransition] = useTransition();

  const handleBlur = () => {
    if (Option.isNone(mediaId) || text.trim() === description.saved.trim()) {
      return;
    }

    onChange({ ...description, saving: "saving" });

    startTransition(async () => {
      const exit = await describe({
        altText: text,
        mediaId: mediaId.value,
        workspaceId,
      });

      onChange(
        exit._tag === "Success"
          ? { saved: text, saving: "saved", text }
          : { ...description, saving: "failed" }
      );
    });
  };

  const status = {
    failed: t("altTextFailed"),
    idle: "",
    saved: t("altTextSaved"),
    saving: t("altTextSaving"),
  } satisfies Record<Saving, string>;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{t("altText")}</Label>
      <Textarea
        id={id}
        value={text}
        maxLength={maxAltTextLength}
        disabled={Option.isNone(mediaId)}
        aria-describedby={`${id}-hint`}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      <p id={`${id}-hint`} className="text-muted-foreground text-xs">
        {Option.isNone(mediaId) ? t("altTextWaiting") : t("altTextHint")}
      </p>
      <output
        className={
          saving === "failed"
            ? "text-destructive-text text-xs"
            : "text-muted-foreground text-xs"
        }
      >
        {status[saving]}
      </output>
    </div>
  );
};

// One file of the list: its progress, then how it ended, and what can be
// done with it.
const UploadItem = ({
  entry,
  onCancel,
  onRemove,
  onRetry,
  workspaceId,
}: {
  readonly entry: Entry;
  readonly onCancel: (entry: Entry) => void;
  readonly onRemove: (entry: Entry) => void;
  readonly onRetry: (entry: Entry, altText: string) => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Media.uploader");
  const format = useFormatter();

  const [description, setDescription] = useState<Description>({
    saved: "",
    saving: "idle",
    text: "",
  });

  const errorMessage = useErrorMessage();
  const progress = useAtomValue(uploadProgress(entry.id));
  const outcome = outcomeOf(useAtomValue(upload(entry.id)));
  const { name } = entry.file;

  const phase = outcome._tag === "running" ? progress.phase : outcome._tag;
  const { sent } = progress;

  const size = useFileSize()(entry.file.size);

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-3">
      <p className="truncate text-sm font-medium" id={`${entry.id}-name`}>
        {name}
      </p>
      <Progress
        value={outcome._tag === "done" ? 100 : Math.round(sent * 100)}
        aria-labelledby={`${entry.id}-name`}
      />
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>
          {size} · {t(`phase.${phase}`)}
          {outcome._tag === "running" && phase === "sending"
            ? ` · ${format.number(sent, { style: "percent" })}`
            : null}
        </span>
        <div className="flex gap-1">
          {outcome._tag === "running" ? (
            <Button
              variant="outline"
              size="xs"
              aria-label={t("cancelLabel", { name })}
              onClick={() => {
                onCancel(entry);
              }}
            >
              {t("cancel")}
            </Button>
          ) : null}
          {outcome._tag === "failed" || outcome._tag === "canceled" ? (
            <Button
              variant="outline"
              size="xs"
              aria-label={t("retryLabel", { name })}
              onClick={() => {
                // A new upload: the description goes with it.
                setDescription({
                  saved: description.text,
                  saving: "idle",
                  text: description.text,
                });
                onRetry(entry, description.text);
              }}
            >
              {t("retry")}
            </Button>
          ) : null}
          {outcome._tag === "running" ? null : (
            <Button
              variant="ghost"
              size="xs"
              aria-label={t("removeLabel", { name })}
              onClick={() => {
                onRemove(entry);
              }}
            >
              {t("remove")}
            </Button>
          )}
        </div>
      </div>
      {outcome._tag === "failed" ? (
        <p role="alert" className="text-destructive-text text-sm">
          {errorMessage(outcome.failure)}
        </p>
      ) : null}
      {outcome._tag === "canceled" ? null : (
        <AltTextField
          description={description}
          entryId={entry.id}
          mediaId={progress.media.pipe(Option.map((media) => media.id))}
          workspaceId={workspaceId}
          onChange={setDescription}
        />
      )}
    </li>
  );
};

/**
 * Uploads images and videos into a workspace: dropped on it or picked, each
 * file goes at once, with its progress, a description to write meanwhile,
 * and a way to cancel it, try it again or take it off the list. Large
 * videos go in parts, several at once, each tried again on its own.
 */
export const MediaUploader = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Media.uploader");
  const registry = useContext(RegistryContext);
  const acceptedId = useId();
  const [entries, setEntries] = useState<readonly Entry[]>([]);
  const [dragging, setDragging] = useState(false);
  const live = useRef<readonly Entry[]>([]);

  // Leaving the page cancels what is still uploading.
  useEffect(
    () => () => {
      for (const entry of live.current) {
        entry.release();
      }
    },
    []
  );

  const start = (entry: Entry, altText: string) => {
    registry.set(upload(entry.id), { altText, file: entry.file, workspaceId });
  };

  const add = (files: FileList | null) => {
    const added = [...(files ?? [])].map((file): Entry => {
      const id = crypto.randomUUID();

      // Mounted here, so the upload runs whatever renders.
      const mounts = [
        registry.mount(uploadProgress(id)),
        registry.mount(upload(id)),
        registry.mount(describeUpload(id)),
      ];

      return {
        file,
        id,
        release: () => {
          for (const unmount of mounts) {
            unmount();
          }
        },
      };
    });

    for (const entry of added) {
      start(entry, "");
    }

    live.current = [...added, ...live.current];
    setEntries(live.current);
  };

  const handleCancel = (entry: Entry) => {
    registry.set(upload(entry.id), Atom.Interrupt);
  };

  const handleRemove = (entry: Entry) => {
    entry.release();
    live.current = live.current.filter(({ id }) => id !== entry.id);
    setEntries(live.current);
  };

  const handlePick = (event: ChangeEvent<HTMLInputElement>) => {
    add(event.target.files);
    // The same file can be picked again.
    event.target.value = "";
  };

  // Files dropped on the picker land in it, as browsers do for any file
  // input: it covers the whole zone, unseen, so it also opens on a click.
  const handleDragEnter = () => {
    setDragging(true);
  };

  const handleDragEnd = () => {
    setDragging(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div
            data-dragging={dragging}
            className="border-input has-focus-visible:border-ring has-focus-visible:ring-ring data-[dragging=true]:border-ring data-[dragging=true]:bg-muted relative flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center has-focus-visible:ring-3"
          >
            <UploadIcon aria-hidden className="text-muted-foreground size-6" />
            <p className="text-sm">
              {dragging ? t("dropping") : t("dropzone")}
            </p>
            <p id={acceptedId} className="text-muted-foreground text-xs">
              {t("accepted")}
            </p>
            <input
              type="file"
              accept={accept}
              multiple
              aria-label={t("choose")}
              aria-describedby={acceptedId}
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handlePick}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragEnd}
              onDrop={handleDragEnd}
            />
          </div>
          {entries.length === 0 ? null : (
            <section aria-label={t("uploads")}>
              <ul className="flex flex-col gap-3">
                {entries.map((entry) => (
                  <UploadItem
                    key={entry.id}
                    entry={entry}
                    workspaceId={workspaceId}
                    onCancel={handleCancel}
                    onRemove={handleRemove}
                    onRetry={start}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
