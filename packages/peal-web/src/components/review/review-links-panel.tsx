"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { DateTime, Exit, Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTranslations } from "next-intl";
import { ReviewLinkAccessSchema } from "peal-contract";
import type { CreatedReviewLink, ReviewLinkAccess } from "peal-contract";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createReviewLink,
  reviewKeys,
  reviewLinks,
  revokeReviewLink,
} from "#review/api.ts";

const decodeAccess = Schema.decodeUnknownOption(ReviewLinkAccessSchema);

// How long a link works, in hours: a day, a week, two weeks, a month, 90
// days.
const lifetimes = [24, 168, 336, 720, 2160] as const;

interface ReviewLinksPanelProps {
  /** Whether the member may make and revoke links (post:approve). */
  readonly canManage: boolean;
  readonly postId: string;
  readonly workspaceId: string;
}

/**
 * The links that show the post to people without an account: making one,
 * whose address is shown once, and the list of those made, to revoke them.
 */
export const ReviewLinksPanel = ({
  canManage,
  postId,
  workspaceId,
}: ReviewLinksPanelProps) => {
  const t = useTranslations("Review");
  const format = useFormatter();
  const id = useId();
  const query = reviewLinks(workspaceId, postId);
  const links = useAtomValue(query);
  const reload = useAtomRefresh(query);
  const create = useAtomSet(createReviewLink, { mode: "promiseExit" });
  const revoke = useAtomSet(revokeReviewLink, { mode: "promiseExit" });
  const [access, setAccess] = useState<ReviewLinkAccess>("comment");
  const [hours, setHours] = useState<(typeof lifetimes)[number]>(336);
  const [made, setMade] = useState<CreatedReviewLink | null>(null);
  const [isPending, startTransition] = useTransition();

  const instant = (at: DateTime.Utc) =>
    format.dateTime(DateTime.toDate(at), {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const make = () => {
    startTransition(async () => {
      const exit = await create({
        params: { postId, workspaceId },
        payload: { access, expiresInHours: hours },
        reactivityKeys: reviewKeys,
      });

      if (Exit.isSuccess(exit)) {
        setMade(exit.value);
      } else {
        toast.error(t("links.createFailed"));
      }
    });
  };

  const end = (linkId: string) => {
    startTransition(async () => {
      const exit = await revoke({
        params: { linkId, workspaceId },
        reactivityKeys: reviewKeys,
      });

      if (Exit.isSuccess(exit)) {
        // Its address, if it is still shown, opens nothing now.
        setMade((current) => (current?.link.id === linkId ? null : current));
        toast.success(t("links.revoked"));
      } else {
        toast.error(t("links.revokeFailed"));
      }
    });
  };

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success(t("links.copied"));
  };

  const listed = (() => {
    if (AsyncResult.isInitial(links)) {
      return null;
    }

    if (AsyncResult.isFailure(links)) {
      return (
        <Alert variant="destructive">
          <AlertDescription>
            <span className="flex flex-wrap items-center justify-between gap-2">
              {t("links.loadFailed")}
              <Button variant="outline" size="sm" onClick={reload}>
                {t("retry")}
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      );
    }

    return links.value.length === 0 ? (
      <p className="text-muted-foreground text-sm">{t("links.empty")}</p>
    ) : (
      <ul className="flex flex-col gap-2">
        {links.value.map((link) => (
          <li
            key={link.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
          >
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant={link.status === "active" ? "default" : "outline"}>
                {t("links.status", { status: link.status })}
              </Badge>
              <span>{t("links.access", { access: link.access })}</span>
              <span className="text-muted-foreground text-xs">
                {t("links.until", { until: instant(link.expiresAt) })}
              </span>
            </span>
            {canManage && link.status === "active" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                focusableWhenDisabled
                onClick={() => {
                  end(link.id);
                }}
              >
                {t("links.revoke")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    );
  })();

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 id={`${id}-title`} className="font-medium">
          {t("links.title")}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t("links.description")}
        </p>
      </div>
      {canManage ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label id={`${id}-access`}>{t("links.accessLabel")}</Label>
            <Select
              value={access}
              disabled={isPending}
              onValueChange={(value) => {
                const chosen = decodeAccess(value);

                if (Option.isSome(chosen)) {
                  setAccess(chosen.value);
                }
              }}
            >
              <SelectTrigger aria-labelledby={`${id}-access`}>
                <SelectValue>{t("links.access", { access })}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ReviewLinkAccessSchema.literals.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t("links.access", { access: value })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label id={`${id}-lifetime`}>{t("links.lifetimeLabel")}</Label>
            <Select
              value={String(hours)}
              disabled={isPending}
              onValueChange={(value) => {
                const chosen = lifetimes.find(
                  (lifetime) => String(lifetime) === value
                );

                if (chosen !== undefined) {
                  setHours(chosen);
                }
              }}
            >
              <SelectTrigger aria-labelledby={`${id}-lifetime`}>
                <SelectValue>
                  {t("links.lifetime", { days: hours / 24 })}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {lifetimes.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {t("links.lifetime", { days: value / 24 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={isPending} focusableWhenDisabled onClick={make}>
            {isPending ? t("links.creating") : t("links.create")}
          </Button>
        </div>
      ) : null}
      {made === null ? null : (
        <Alert>
          <AlertTitle>{t("links.madeTitle")}</AlertTitle>
          <AlertDescription>
            <span className="flex flex-col gap-2">
              <span>
                {t("links.madeDescription", {
                  access: made.link.access,
                  until: instant(made.link.expiresAt),
                })}
              </span>
              <code className="bg-muted rounded px-2 py-1 text-xs break-all">
                {made.url}
              </code>
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void copy(made.url);
                  }}
                >
                  {t("links.copy")}
                </Button>
              </span>
            </span>
          </AlertDescription>
        </Alert>
      )}
      {listed}
    </section>
  );
};
