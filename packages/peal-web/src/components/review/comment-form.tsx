"use client";

import { useTranslations } from "next-intl";
import { maxCommentLength } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { Label } from "peal-ui/components/label";
import { Textarea } from "peal-ui/components/textarea";
import { useId, useState, useTransition } from "react";
import type { ReactNode, SubmitEvent } from "react";

interface CommentFormProps {
  /** What comes before the text: a visitor's name and address. */
  readonly children?: ReactNode;
  /** Whether what `children` asks for is filled in. */
  readonly complete?: boolean;
  readonly label: string;
  /** Sends the text, and says whether it was taken: the form then empties. */
  readonly onSubmit: (text: string) => Promise<boolean>;
  readonly submitLabel: string;
  readonly submittingLabel: string;
}

/**
 * Writes a comment, an answer, or what to change: plain text, counted as
 * the server counts it.
 */
export const CommentForm = ({
  children,
  complete = true,
  label,
  onSubmit,
  submitLabel,
  submittingLabel,
}: CommentFormProps) => {
  const t = useTranslations("Review");
  const id = useId();
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const tooLong = text.length > maxCommentLength;
  const sendable = text.trim() !== "" && !tooLong && complete && !isPending;

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sendable) {
      return;
    }

    startTransition(async () => {
      if (await onSubmit(text)) {
        setText("");
      }
    });
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      {children}
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Textarea
          dir="auto"
          id={id}
          value={text}
          aria-invalid={tooLong}
          aria-describedby={`${id}-hint`}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {t("form.hint", { count: text.length, maximum: maxCommentLength })}
        </p>
      </div>
      <div>
        <Button type="submit" disabled={!sendable} focusableWhenDisabled>
          {isPending ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
};
