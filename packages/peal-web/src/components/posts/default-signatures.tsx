"use client";

import { useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTranslations } from "next-intl";
import type { Post } from "peal-contract";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import { useId, useState } from "react";

import { workspaceSignatures } from "#signatures/atoms.ts";
import { defaultSignatures } from "#signatures/draft.ts";

/** Whether a new post takes the workspace's default signatures. */
export interface DefaultSigning {
  /** The names of the default signatures; none when nothing is offered. */
  readonly names: readonly string[];
  /**
   * What the request that creates the post adds to its payload: the
   * defaults, when the member left the box ticked.
   */
  readonly payload: { readonly defaultSignatures?: true };
  readonly setWanted: (wanted: boolean) => void;
  /**
   * The saved post's texts when it was created with the defaults, for the
   * composer to show what will go out; none when it was not.
   */
  readonly textsOf: (saved: Post) =>
    | {
        readonly overrides: Record<string, string>;
        readonly text: string;
      }
    | undefined;
  readonly wanted: boolean;
}

/**
 * The default signatures of a post being written. They are offered for a
 * new post only (`isNew`), in a workspace that has some: the request that
 * first saves the post asks the server for them, and no later one does.
 */
export const useDefaultSigning = (
  workspaceId: string,
  isNew: boolean
): DefaultSigning => {
  const signatures = useAtomValue(workspaceSignatures(workspaceId));
  const [wanted, setWanted] = useState(true);

  const names =
    isNew && AsyncResult.isSuccess(signatures)
      ? defaultSignatures(signatures.value).map(({ name }) => name)
      : [];

  const asked = wanted && names.length > 0;

  return {
    names,
    payload: asked ? { defaultSignatures: true } : {},
    setWanted,
    textsOf: (saved) =>
      asked
        ? {
            overrides: Object.fromEntries(
              saved.content.overrides.map(({ channelId, text }) => [
                channelId,
                text,
              ])
            ),
            text: saved.content.text,
          }
        : undefined,
    wanted,
  };
};

/** The box itself: ticked, the post is saved with the signatures named. */
export const DefaultSignaturesView = ({
  disabled,
  names,
  onChange,
  wanted,
}: {
  readonly disabled: boolean;
  readonly names: readonly string[];
  readonly onChange: (wanted: boolean) => void;
  readonly wanted: boolean;
}) => {
  const t = useTranslations("Signatures");
  const format = useFormatter();
  const id = useId();

  return names.length === 0 ? null : (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        checked={wanted}
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        onCheckedChange={(checked) => {
          onChange(checked === true);
        }}
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{t("addDefault", { count: names.length })}</Label>
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {t("addDefaultHint", {
            count: names.length,
            names: format.list(names, { type: "conjunction" }),
          })}
        </p>
      </div>
    </div>
  );
};

/**
 * Under a new post's text: whether to add the workspace's default
 * signatures when the post is first saved. Nothing shows once the post is
 * saved, or in a workspace without a default signature.
 */
export const DefaultSignatures = ({
  disabled,
  signing,
}: {
  readonly disabled: boolean;
  readonly signing: DefaultSigning;
}) => (
  <DefaultSignaturesView
    disabled={disabled}
    names={signing.names}
    wanted={signing.wanted}
    onChange={(wanted) => {
      signing.setWanted(wanted);
    }}
  />
);
