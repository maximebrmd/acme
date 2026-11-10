"use client";

import { useAtomSet } from "@effect/atom-react";
import { Cause, DateTime, Exit, Option } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type { OpenContractRequest } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { Textarea } from "peal-ui/components/textarea";
import { useId, useState, useTransition } from "react";

import { useRouter } from "#i18n/navigation.ts";
import { applyContractRequest, closeContractRequest } from "#staff/atoms.ts";

type RequestError = "notFound" | "settled" | "unavailable" | "unknown";

const errors: ReadonlyMap<string, RequestError> = new Map([
  ["BillingUnavailable", "unavailable"],
  ["ContractRequestNotFound", "notFound"],
  ["ContractRequestSettled", "settled"],
  ["NotFound", "notFound"],
]);

const errorOf = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): RequestError | null =>
  Exit.isSuccess(exit)
    ? null
    : Cause.findErrorOption(exit.cause).pipe(
        Option.flatMap(({ _tag }) => Option.fromUndefinedOr(errors.get(_tag))),
        Option.getOrElse((): RequestError => "unknown")
      );

type Done =
  | { readonly _tag: "applied" }
  | { readonly _tag: "closed" }
  | { readonly _tag: "refused"; readonly refusal: string };

/**
 * A request that waits for staff: what its sender wrote, and the two
 * things staff do with it, each with the reason the audit log keeps.
 */
export const ContractRequestCard = ({
  request,
}: {
  readonly request: OpenContractRequest;
}) => {
  const t = useTranslations("Staff.requests");
  const format = useFormatter();
  const router = useRouter();
  const apply = useAtomSet(applyContractRequest, { mode: "promiseExit" });
  const close = useAtomSet(closeContractRequest, { mode: "promiseExit" });
  const workspaceFieldId = useId();
  const reasonId = useId();
  const [workspaceId, setWorkspaceId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<RequestError | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [pending, setPending] = useState<"apply" | "close" | null>(null);
  const [, startTransition] = useTransition();

  const params = { requestId: request.id };

  const run = (
    action: "apply" | "close",
    send: () => Promise<readonly [RequestError | null, Done | null]>
  ) => {
    setPending(action);
    setError(null);

    startTransition(async () => {
      const [failed, ended] = await send();

      setPending(null);
      setError(failed);
      setDone(ended);

      if (ended !== null) {
        router.refresh();
      }
    });
  };

  const handleApply = () => {
    run("apply", async () => {
      const exit = await apply({
        params,
        payload: { reason: reason.trim(), workspaceId: workspaceId.trim() },
      });

      if (!Exit.isSuccess(exit)) {
        return [errorOf(exit), null];
      }

      return [
        null,
        exit.value.status === "applied"
          ? { _tag: "applied" }
          : { _tag: "refused", refusal: exit.value.refusal ?? "other" },
      ];
    });
  };

  const handleClose = () => {
    run("close", async () => {
      const exit = await close({ params, payload: { reason: reason.trim() } });

      return Exit.isSuccess(exit)
        ? [null, { _tag: "closed" }]
        : [errorOf(exit), null];
    });
  };

  const rows: [string, string][] = [
    [
      t("received"),
      format.dateTime(DateTime.toDate(request.receivedAt), {
        dateStyle: "long",
        timeStyle: "short",
      }),
    ],
    [t("name"), request.name ?? t("notGiven")],
    [t("email"), request.email ?? t("notGiven")],
    [t("contract"), request.contract ?? t("notGiven")],
    [t("account"), request.userId ?? t("noAccount")],
  ];

  if (request.desiredOn !== null) {
    rows.push([
      t("desiredOn"),
      format.dateTime(DateTime.toDate(request.desiredOn), {
        dateStyle: "long",
        timeZone: "UTC",
      }),
    ]);
  }

  const busy = pending !== null;
  const noReason = reason.trim() === "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("kind", { kind: request.kind })}</h2>
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            {t("status", { status: request.status })}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
            {rows.map(([term, value]) => (
              <div key={term} className="contents">
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="break-all">{value}</dd>
              </div>
            ))}
          </dl>
          {error === null ? null : (
            <Alert variant="destructive" aria-live="assertive">
              <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
            </Alert>
          )}
          {done === null ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor={workspaceFieldId}>{t("workspaceId")}</Label>
                <Input
                  id={workspaceFieldId}
                  value={workspaceId}
                  autoComplete="off"
                  aria-describedby={`${workspaceFieldId}-hint`}
                  onChange={(event) => {
                    setWorkspaceId(event.target.value);
                  }}
                />
                <p
                  id={`${workspaceFieldId}-hint`}
                  className="text-muted-foreground text-xs"
                >
                  {t("workspaceHint")}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={reasonId}>{t("reason")}</Label>
                <Textarea
                  id={reasonId}
                  value={reason}
                  maxLength={500}
                  aria-describedby={`${reasonId}-hint`}
                  onChange={(event) => {
                    setReason(event.target.value);
                  }}
                />
                <p
                  id={`${reasonId}-hint`}
                  className="text-muted-foreground text-xs"
                >
                  {t("reasonHint")}
                </p>
              </div>
            </>
          ) : (
            <Alert aria-live="polite">
              <AlertDescription>
                {done._tag === "refused"
                  ? t("refused", { refusal: done.refusal })
                  : t(done._tag)}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      {done === null ? (
        <CardFooter>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || noReason || workspaceId.trim() === ""}
              focusableWhenDisabled
              onClick={handleApply}
            >
              {pending === "apply" ? t("applying") : t("apply")}
            </Button>
            <Button
              variant="outline"
              disabled={busy || noReason}
              focusableWhenDisabled
              onClick={handleClose}
            >
              {pending === "close" ? t("closing") : t("close")}
            </Button>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
};
