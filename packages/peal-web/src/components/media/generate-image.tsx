"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ImageAspectSchema } from "peal-contract";
import type { AssistantStatus, ImageAspect, Media } from "peal-contract";
import { Alert, AlertTitle } from "peal-ui/components/alert";
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
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { assistantStatus, generateImage } from "#assistant/api.ts";
import {
  imageAllowanceHint,
  imageFailureKey,
  isImageRetryable,
  isProviderRefusal,
} from "#assistant/image-failure.ts";
import type { ImageFailure } from "#assistant/image-failure.ts";
import { useOfferUpgrade } from "#components/billing/use-offer-upgrade.ts";
import { Link } from "#i18n/navigation.ts";
import { mediaKey } from "#media/atoms.ts";
import { failureOf } from "#posts/outcome.ts";

const isAspect = Schema.is(ImageAspectSchema);

const unexpected = (): ImageFailure => ({ _tag: "Unexpected" });

interface GenerateImageProps {
  readonly disabled?: boolean;
  /**
   * The member may change the assistant's settings (assistant:configure):
   * a refusal of the workspace's own provider links them there.
   */
  readonly mayConfigure?: boolean;
  /** Called with the new image, once it is in the library. */
  readonly onGenerated?: (media: Media) => void;
  readonly workspaceId: string;
}

const GenerateDialog = ({
  disabled = false,
  mayConfigure = false,
  onGenerated,
  status,
  workspaceId,
}: GenerateImageProps & { readonly status: AssistantStatus }) => {
  const t = useTranslations("Assistant.images");
  const promptId = useId();
  const hintId = useId();
  const aspectId = useId();
  const generate = useAtomSet(generateImage, { mode: "promiseExit" });
  const refreshStatus = useAtomRefresh(assistantStatus(workspaceId));
  const offerUpgrade = useOfferUpgrade();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<ImageAspect>("square");
  const [failure, setFailure] = useState<ImageFailure | null>(null);
  const [generating, startTransition] = useTransition();

  const { images, remaining } = status;
  // The workspace's own provider makes its images, at no request's cost.
  const own = images.source === "workspace";
  // Shown, never blocking: a refusal of the quota opens the upgrade dialog.
  const hint = imageAllowanceHint(status);
  const blank = prompt.trim() === "";

  // What an image costs: nothing from the workspace's own provider, one
  // of the month's images on a server that bills, today's requests
  // elsewhere.
  const costLine = () => {
    if (own) {
      return t("ownProvider");
    }

    return images.month === null
      ? t("cost", { cost: images.requestCost, remaining })
      : t("costMonth", {
          remaining: Math.max(0, images.month.most - images.month.used),
        });
  };

  const handleOpenChange = (next: boolean) => {
    // An image being made is waited for: closing would lose its answer.
    if (generating) {
      return;
    }

    setOpen(next);
    setFailure(null);
  };

  const run = () => {
    setFailure(null);

    startTransition(async () => {
      const exit = await generate({
        params: { workspaceId },
        payload: { aspect, prompt },
        reactivityKeys: [mediaKey(workspaceId)],
      });

      // Whatever it ended with, the count of requests left may change.
      refreshStatus();
      offerUpgrade(exit);

      if (Exit.isSuccess(exit)) {
        onGenerated?.(exit.value);
        setOpen(false);
        setPrompt("");
        toast.success(t("generated"));

        return;
      }

      setFailure(Option.getOrElse(failureOf(exit), unexpected));
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" disabled={disabled} />}>
        <SparklesIcon aria-hidden data-icon="inline-start" />
        {t("open")}
      </DialogTrigger>
      <DialogContent closeLabel={t("close")}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();

            if (!blank && !generating) {
              run();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {own ? t("descriptionOwn") : t("description")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={promptId}>{t("prompt")}</Label>
            <Textarea
              id={promptId}
              aria-describedby={hintId}
              disabled={generating}
              maxLength={images.maxPromptLength}
              required
              rows={4}
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
              }}
            />
            <p id={hintId} className="text-muted-foreground text-xs">
              {t("promptHint", { maxLength: images.maxPromptLength })}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={aspectId}>{t("aspect")}</Label>
            <Select
              items={images.aspects.map((each) => ({
                label: t("aspects", { aspect: each }),
                value: each,
              }))}
              value={aspect}
              disabled={generating}
              onValueChange={(chosen) => {
                if (isAspect(chosen)) {
                  setAspect(chosen);
                }
              }}
            >
              <SelectTrigger id={aspectId} className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {images.aspects.map((each) => (
                  <SelectItem key={each} value={each}>
                    {t("aspects", { aspect: each })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-muted-foreground text-sm">{costLine()}</p>
          <div aria-live="polite" className="flex flex-col gap-2">
            {hint === null ? null : (
              <Alert>
                <AlertTitle>
                  {hint === "noImagesOnPlan"
                    ? t("noImagesOnPlan")
                    : t("notEnough")}
                </AlertTitle>
              </Alert>
            )}
            {generating ? (
              <p className="text-sm" aria-busy="true">
                {t("generating")}
              </p>
            ) : null}
            {failure === null ? null : (
              <Alert variant="destructive">
                <AlertTitle>
                  {t(`errors.${imageFailureKey(failure)}`, {
                    dailyLimit:
                      failure._tag === "OwnImageLimitReached"
                        ? failure.dailyLimit
                        : 0,
                    maxLength: images.maxPromptLength,
                  })}
                </AlertTitle>
                {mayConfigure && isProviderRefusal(failure) ? (
                  <Link
                    className="text-sm underline"
                    href={`/app/${workspaceId}/settings/assistant`}
                  >
                    {t("providerSettings")}
                  </Link>
                ) : null}
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={generating}
              onClick={() => {
                handleOpenChange(false);
              }}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={blank || generating}>
              {failure !== null && isImageRetryable(failure)
                ? t("retry")
                : t("generate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/**
 * "Generate an image": the assistant makes an image from a description
 * into the workspace's media library, marked as made by AI. Shown only
 * while images can be made (the workspace's own provider, or the server's
 * image model); render it only for members with both assistant:use and
 * media:upload.
 */
export const GenerateImage = (props: GenerateImageProps) => {
  const status = AsyncResult.value(
    useAtomValue(assistantStatus(props.workspaceId))
  );

  return Option.isSome(status) && status.value.images.available ? (
    <GenerateDialog {...props} status={status.value} />
  ) : null;
};
