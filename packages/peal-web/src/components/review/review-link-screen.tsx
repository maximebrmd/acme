"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { DateTime, Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTimeZone, useTranslations } from "next-intl";
import { maxVisitorNameLength } from "peal-contract";
import type { NewComment, ReviewPage } from "peal-contract";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { Skeleton } from "peal-ui/components/skeleton";
import { useId, useState, useSyncExternalStore, useTransition } from "react";

import { PealApi } from "#api/client.ts";
import { useCaptcha } from "#components/auth/turnstile-field.tsx";
import { failureOf } from "#posts/outcome.ts";
import {
  openReviewLink,
  visitorApprove,
  visitorComment,
  visitorRequestChanges,
} from "#review/api.ts";
import { failureText } from "#review/failure-text.ts";
import type { ReviewFailure } from "#review/failure-text.ts";
import { tokenOfFragment } from "#review/link-token.ts";

import { CommentForm } from "./comment-form.tsx";
import { ReviewBoard } from "./review-board.tsx";

// The link's token is what follows the # in its address: browsers keep it
// to themselves, so it reaches no server's logs, and no other site.
const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);

  return () => {
    window.removeEventListener("hashchange", onChange);
  };
};

const tokenInAddress = () => tokenOfFragment(window.location.hash);

// Before the page runs in the browser, the token is not known yet.
const noToken = () => null;

const reloadKeys = ["review-link"];

const unexpected: ReviewFailure = { _tag: "Unexpected" };

const captchaSettings = PealApi.query("captcha", "get", {});

const Message = ({
  description,
  title,
}: {
  readonly description: string;
  readonly title: string;
}) => (
  <Alert>
    <AlertTitle>{title}</AlertTitle>
    <AlertDescription>{description}</AlertDescription>
  </Alert>
);

interface OpenLinkProps {
  /** Reads the link again: the post changed since the page showed it. */
  readonly onChanged: () => void;
  readonly page: ReviewPage;
  readonly token: string;
}

// What the link shows, and what its holder may do.
const OpenLink = ({ onChanged, page, token }: OpenLinkProps) => {
  const t = useTranslations("Review");
  const format = useFormatter();
  const timeZone = useTimeZone();
  const id = useId();
  const comment = useAtomSet(visitorComment, { mode: "promiseExit" });
  const approve = useAtomSet(visitorApprove, { mode: "promiseExit" });
  const sendBack = useAtomSet(visitorRequestChanges, { mode: "promiseExit" });
  const settings = useAtomValue(captchaSettings);
  const [name, setName] = useState("");
  // The check is loaded only once the reader starts to write: reading the
  // post asks nothing of anyone but Peal.
  const [writing, setWriting] = useState(false);
  const [failure, setFailure] = useState<ReviewFailure | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const mayWrite = page.access !== "view";

  const siteKey =
    writing && AsyncResult.isSuccess(settings)
      ? settings.value.turnstileSiteKey
      : null;

  const captcha = useCaptcha(siteKey);
  const named = name.trim() !== "" && captcha.ready;
  const headers = { ...captcha.headers, "x-review-token": token };

  const instant = (at: DateTime.Utc) =>
    format.dateTime(DateTime.toDate(at), {
      dateStyle: "full",
      timeStyle: "short",
    });

  const settled = <A, E extends ReviewFailure>(exit: Exit.Exit<A, E>) => {
    // A check's token works once, whatever the answer.
    captcha.reset();

    const failed = Exit.isSuccess(exit)
      ? null
      : Option.getOrElse(failureOf(exit), () => unexpected);

    setFailure(failed);

    // A decision is for what this page showed: when the post says
    // something else now, the page shows it before anything is decided.
    if (failed?._tag === "ApprovalChanged") {
      onChanged();
    }

    return Exit.isSuccess(exit);
  };

  // The approval this page shows, which a decision names: what was read.
  const shown = {
    approvalId: page.approval?.id ?? "",
    subjectHash: page.approval?.subjectHash ?? "",
  };

  const startWriting = () => {
    setWriting(true);
  };

  const onComment = async (draft: NewComment) =>
    settled(
      await comment({
        headers,
        payload: { ...draft, name },
        reactivityKeys: reloadKeys,
      })
    );

  const decide = () => {
    startTransition(async () => {
      const exit = await approve({
        headers,
        payload: { ...shown, name },
        reactivityKeys: reloadKeys,
      });

      if (settled(exit) && Exit.isSuccess(exit)) {
        setThanks(t(exit.value.late ? "page.approvedLate" : "page.approved"));
      }
    });
  };

  const identity = (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">
        {t("page.identityLegend")}
      </legend>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-name`}>{t("page.nameLabel")}</Label>
        <Input
          id={`${id}-name`}
          autoComplete="name"
          maxLength={maxVisitorNameLength}
          value={name}
          aria-describedby={`${id}-name-hint`}
          onFocus={startWriting}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <p id={`${id}-name-hint`} className="text-muted-foreground text-xs">
          {t("page.nameHint")} {t("page.privacy")}
        </p>
      </div>
      {captcha.widget}
    </fieldset>
  );

  const pending = page.approval?.status === "pending";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p>
          {t("page.status", {
            at: page.schedule === null ? "" : instant(page.schedule.at),
            status: page.status,
            zone: timeZone ?? "UTC",
          })}
        </p>
        <p className="text-muted-foreground text-sm">
          {t("page.expires", { at: instant(page.expiresAt) })}
        </p>
      </div>
      {thanks === null ? null : (
        <Alert>
          <AlertDescription>
            <output>{thanks}</output>
          </AlertDescription>
        </Alert>
      )}
      {mayWrite ? identity : null}
      <ReviewBoard
        canComment={mayWrite}
        channels={page.channels}
        comments={page.comments}
        failure={failure === null ? null : failureText(t, failure)}
        identityComplete={named}
        media={page.media}
        poll={page.poll}
        onComment={onComment}
      />
      {page.access === "approve" ? (
        <section
          aria-labelledby={`${id}-decide`}
          className="flex flex-col gap-4 rounded-lg border p-4"
        >
          <h2 id={`${id}-decide`} className="text-lg font-semibold">
            {t("page.decideTitle")}
          </h2>
          {pending ? (
            <>
              <p className="text-muted-foreground text-sm">
                {t("page.decideIntro")}
              </p>
              <div>
                <Button
                  disabled={!named || isPending}
                  focusableWhenDisabled
                  onClick={decide}
                >
                  {isPending ? t("page.approving") : t("page.approve")}
                </Button>
              </div>
              <CommentForm
                complete={named}
                label={t("page.changesLabel")}
                submitLabel={t("page.requestChanges")}
                submittingLabel={t("form.sending")}
                onSubmit={async (text) => {
                  const taken = settled(
                    await sendBack({
                      headers,
                      payload: { ...shown, comment: text, name },
                      reactivityKeys: reloadKeys,
                    })
                  );

                  if (taken) {
                    setThanks(t("page.changesSent"));
                  }

                  return taken;
                }}
              />
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("page.decided", {
                status: page.approval?.status ?? "none",
              })}
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
};

// The link's page, by its token.
const LinkPage = ({ token }: { readonly token: string }) => {
  const t = useTranslations("Review");
  const query = openReviewLink(token);
  const result = useAtomValue(query);
  const reload = useAtomRefresh(query);

  if (AsyncResult.isSuccess(result)) {
    return <OpenLink page={result.value} token={token} onChanged={reload} />;
  }

  if (AsyncResult.isInitial(result)) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <span className="sr-only">{t("page.loading")}</span>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const failure = Option.getOrUndefined(AsyncResult.error(result));

  if (failure?._tag === "ReviewLinkClosed") {
    return (
      <Message
        title={t("page.closed.title")}
        description={t("page.closed.reason", { reason: failure.reason })}
      />
    );
  }

  return failure?._tag === "ReviewLinkNotFound" ? (
    <Message
      title={t("page.notFound.title")}
      description={t("page.notFound.description")}
    />
  ) : (
    <Message
      title={t("page.failed.title")}
      description={t("page.failed.description")}
    />
  );
};

/**
 * The page behind a review link: one post, as each channel will receive
 * it, for someone without an account. The link's token is read from the
 * address in the browser, and sent to Peal in a header.
 */
export const ReviewLinkScreen = () => {
  const t = useTranslations("Review");
  const token = useSyncExternalStore(subscribeToHash, tokenInAddress, noToken);

  if (token === null) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <span className="sr-only">{t("page.loading")}</span>
        <Skeleton className="h-8 w-2/3" />
      </div>
    );
  }

  return token === "" ? (
    <Message
      title={t("page.noToken.title")}
      description={t("page.noToken.description")}
    />
  ) : (
    <LinkPage key={token} token={token} />
  );
};
