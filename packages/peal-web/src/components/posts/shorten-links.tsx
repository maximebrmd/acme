"use client";

import { useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type {
  Platform,
  Post,
  PostContent,
  ShortLinkStatus,
} from "peal-contract";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import { useId, useState } from "react";

import { shortLinkStatus } from "#short-links/atoms.ts";
import { shortenedCount } from "#short-links/count.ts";

/** Every text of a post: its own, its channels' and its parts'. */
export const textsOf = (content: PostContent): readonly string[] => [
  content.text,
  ...content.overrides.map((own) => own.text),
  ...(content.followUps ?? []).flatMap((part) => [
    part.text,
    ...part.overrides.map((own) => own.text),
  ]),
];

/** Whether the post being written asks for short links. */
export interface ShortLinking {
  /** What the server offers; none until it answers, or when it has none. */
  readonly offered: ShortLinkStatus | undefined;
  /** What the request that saves the post adds to its payload. */
  readonly payload: { readonly shortenLinks?: boolean };
  /**
   * Whether the server's answer came, so a post saved now takes the
   * workspace's default: the composer saves nothing before.
   */
  readonly settled: boolean;
  readonly setWanted: (wanted: boolean) => void;
  readonly wanted: boolean;
}

/**
 * The post's choice: the member's, else the saved post's, else the
 * workspace's default for a new one. Nothing is sent on a server
 * without short links.
 */
export const useShortLinking = (
  workspaceId: string,
  post: Post | undefined
): ShortLinking => {
  const status = useAtomValue(shortLinkStatus(workspaceId));
  const [chosen, setChosen] = useState<boolean | undefined>(undefined);

  const offered =
    AsyncResult.isSuccess(status) && status.value.available
      ? status.value
      : undefined;

  const wanted = chosen ?? post?.shortenLinks ?? offered?.byDefault ?? false;

  return {
    offered,
    payload: offered === undefined ? {} : { shortenLinks: wanted },
    setWanted: setChosen,
    settled: !AsyncResult.isInitial(status) && !status.waiting,
    wanted,
  };
};

/**
 * Under the post's text, on a server with short links: the box that asks
 * for them, and how many of the post's links will go out shortened.
 */
export const ShortenLinks = ({
  disabled,
  linking,
  platforms,
  texts,
}: {
  readonly disabled: boolean;
  readonly linking: ShortLinking;
  /** The chosen channels' platforms. */
  readonly platforms: readonly Platform[];
  /** The post's texts: its own, its channels' and its parts'. */
  readonly texts: readonly string[];
}) => {
  const t = useTranslations("ShortLinks.composer");
  const id = useId();
  const { offered } = linking;

  if (offered === undefined || offered.base === null) {
    return null;
  }

  const handleChange = (checked: boolean) => {
    linking.setWanted(checked);
  };

  const counted = shortenedCount(texts, platforms, {
    base: offered.base,
    codeLength:
      (offered.shortLength ?? offered.base.length) - offered.base.length,
  });

  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        checked={linking.wanted}
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        onCheckedChange={handleChange}
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{t("label")}</Label>
        <p
          id={`${id}-hint`}
          aria-live="polite"
          className="text-muted-foreground text-xs"
        >
          {linking.wanted ? t("count", { count: counted.links }) : t("off")}{" "}
          {counted.keptAsWritten ? t("keptAsWritten") : null}
        </p>
      </div>
    </div>
  );
};
