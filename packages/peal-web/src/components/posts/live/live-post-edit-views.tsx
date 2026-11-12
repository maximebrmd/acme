import { Match } from "effect";
import { useTranslations } from "next-intl";
import type { LivePostRefusal, Platform, TargetOptions } from "peal-contract";
import { Button } from "peal-ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "peal-ui/components/dialog";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { Textarea } from "peal-ui/components/textarea";
import { useId, useState } from "react";

import { fitOn } from "#posts/character-count.ts";
import type { EditState } from "#posts/live-post.ts";

/** Why an edit did not go: a refusal by reason, a text refused, or else. */
export type EditFailure = LivePostRefusal | "forbidden" | "invalid" | "other";

interface LivePostEditViewProps {
  /** Whether a request for the channel runs. */
  readonly busy: boolean;
  /** The channel, named. */
  readonly channelName: string;
  /** When the post was last edited there, if it was. */
  readonly editedAt: Date | null;
  readonly onSave: (part: number, text: string) => void;
  /** The target's options there, which some platforms count with the text. */
  readonly options: TargetOptions | undefined;
  /** The channel's platform, named. */
  readonly platform: string;
  /** The platform, as the rules know it, for the counter. */
  readonly platformId: Platform;
  readonly state: EditState;
  /** The text of each part of the post on the channel, in order. */
  readonly texts: readonly string[];
}

// The editor for one part of the post on the channel, with the channel's
// counter, as the composer counts.
const EditDialog = ({
  busy,
  channelName,
  label,
  onSave,
  options,
  platformId,
  texts,
}: Omit<LivePostEditViewProps, "editedAt" | "platform" | "state"> & {
  readonly label: string;
}) => {
  const t = useTranslations("Posts.Live");
  const id = useId();
  const [open, setOpen] = useState(false);
  const [part, setPart] = useState(0);
  const [text, setText] = useState(texts[0] ?? "");
  const { tightest } = fitOn(platformId, text, 0, options);
  const over = tightest !== undefined && tightest.remaining < 0;
  // Parts are known by their place alone.
  const places = texts.map((_text, place) => place);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);

        if (next) {
          setPart(0);
          setText(texts[0] ?? "");
        }
      }}
    >
      <DialogTrigger
        render={<Button variant="outline" size="sm" />}
        disabled={busy}
      >
        {label}
      </DialogTrigger>
      <DialogContent closeLabel={t("cancel")} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>{t("editDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setOpen(false);
            onSave(part, text);
          }}
        >
          {texts.length > 1 ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-part`}>{t("editPart")}</Label>
              <Select
                value={String(part)}
                onValueChange={(value) => {
                  const chosen = Number(value);

                  setPart(chosen);
                  setText(texts[chosen] ?? "");
                }}
              >
                <SelectTrigger id={`${id}-part`}>
                  <SelectValue>
                    {t("partName", { number: part + 1 })}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {places.map((place) => (
                    <SelectItem key={place} value={String(place)}>
                      {t("partName", { number: place + 1 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-text`}>
              {t("editText", { channel: channelName })}
            </Label>
            <Textarea
              id={`${id}-text`}
              rows={6}
              aria-describedby={`${id}-count`}
              aria-invalid={over}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
              }}
            />
            {tightest === undefined ? null : (
              <p
                id={`${id}-count`}
                className={
                  over
                    ? "text-destructive text-sm"
                    : "text-muted-foreground text-sm"
                }
              >
                {t("count", {
                  length: tightest.length,
                  maximum: tightest.maximum,
                })}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={text.trim() === "" || over}>
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// The action for the edit's state: the editor, an edit under way, one
// that failed with a way to ask again, or why the platform does not let
// Peal.
const EditAction = (props: LivePostEditViewProps) => {
  const t = useTranslations("Posts.Live");
  const { busy, platform, state } = props;

  return Match.valueTags(state, {
    blocked: ({ by }) => (
      <p className="text-muted-foreground text-sm">
        {t("editBlocked", { by: by ?? "other", platform })}
      </p>
    ),
    busy: () => null,
    editing: () => (
      <output className="text-muted-foreground text-sm">{t("editing")}</output>
    ),
    failed: ({ code }) => (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-destructive text-sm">
          {t("editFailed", { code: code ?? "unknown" })}
        </p>
        <EditDialog {...props} label={t("retry")} />
      </div>
    ),
    none: () => null,
    offered: () => (
      <EditDialog {...props} label={busy ? t("editing") : t("edit")} />
    ),
  });
};

/**
 * What a member who may publish sees of editing a live post on one
 * channel: when it was last edited, and the action for where the edit
 * stands. Nothing while another change runs, or once the post was
 * removed, unless it was edited before.
 */
export const LivePostEditView = (props: LivePostEditViewProps) => {
  const t = useTranslations("Posts.Live");
  const { editedAt, state } = props;
  const acts = state._tag !== "none" && state._tag !== "busy";

  if (editedAt === null && !acts) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {editedAt === null ? null : (
        <p className="text-sm">{t("edited", { at: editedAt })}</p>
      )}
      {acts ? <EditAction {...props} /> : null}
    </div>
  );
};

/** Why a request to edit the post did not go, in words. */
export const useEditFailureText = () => {
  const t = useTranslations("Posts.Live");

  return (failure: EditFailure) => t("editRefused", { reason: failure });
};
