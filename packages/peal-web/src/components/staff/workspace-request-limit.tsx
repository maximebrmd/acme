"use client";

import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import { useTranslations } from "next-intl";
import { maxRequestLimitPerMinute } from "peal-contract";
import type { StaffRequestLimit } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { Textarea } from "peal-ui/components/textarea";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { Instant } from "#components/staff/instant.tsx";
import { useRouter } from "#i18n/navigation.ts";
import { setWorkspaceRequestLimit } from "#staff/atoms.ts";
import { staffErrorKey } from "#staff/errors.ts";
import type { StaffErrorKey } from "#staff/errors.ts";

/** What the rate card offers on request. */
const offered = 1200;

/**
 * A workspace's API rate limit: what its keys send under now, and, on a
 * server that bills, a limit of its own, set or removed with the reason
 * the audit log keeps.
 */
export const WorkspaceRequestLimit = ({
  limit,
  setAt,
  workspaceId,
}: {
  readonly limit: StaffRequestLimit;
  /** When staff set its own limit, as an ISO instant. */
  readonly setAt: string | null;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Staff.requestLimit");
  const actions = useTranslations("Staff.actions");
  const errors = useTranslations("Staff.errors");
  const router = useRouter();
  const reasonId = useId();
  const limitId = useId();
  const set = useAtomSet(setWorkspaceRequestLimit, { mode: "promiseExit" });

  const [perMinute, setPerMinute] = useState(
    String(limit.override?.requestsPerMinute ?? offered)
  );

  const [reason, setReason] = useState("");
  const [error, setError] = useState<StaffErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const current = (
    <p className="text-sm">
      {t("current", {
        policy: limit.policy,
        requestsPerMinute: limit.requestsPerMinute,
      })}
      {setAt === null ? null : (
        <>
          {" "}
          {t("setOn")} <Instant value={setAt} />
        </>
      )}
    </p>
  );

  if (!limit.bills) {
    return (
      <div className="flex flex-col gap-2">
        {current}
        <p className="text-muted-foreground text-sm">{t("unbilled")}</p>
      </div>
    );
  }

  const requested = Number(perMinute);

  const valid =
    Number.isInteger(requested) &&
    requested >= 1 &&
    requested <= maxRequestLimitPerMinute;

  const send = (requestsPerMinute: number | null) => {
    startTransition(async () => {
      const exit = await set({
        params: { workspaceId },
        payload: { reason: reason.trim(), requestsPerMinute },
      });

      Option.match(staffErrorKey(exit), {
        onNone: () => {
          setError(null);
          setReason("");
          toast.success(requestsPerMinute === null ? t("removed") : t("saved"));
          router.refresh();
        },
        onSome: setError,
      });
    });
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(requested);
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-3">
      {current}
      <p className="text-muted-foreground text-sm">{t("hint")}</p>
      {error === null ? null : (
        <Alert variant="destructive">
          <AlertDescription>{errors(error)}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor={limitId}>{t("limit")}</Label>
        <Input
          id={limitId}
          aria-describedby={`${limitId}-hint`}
          type="number"
          inputMode="numeric"
          min={1}
          max={maxRequestLimitPerMinute}
          step={1}
          value={perMinute}
          required
          onChange={(event) => {
            setPerMinute(event.target.value);
          }}
        />
        <p id={`${limitId}-hint`} className="text-muted-foreground text-sm">
          {t("limitHint", { most: maxRequestLimitPerMinute, offered })}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={reasonId}>{actions("reason")}</Label>
        <Textarea
          id={reasonId}
          aria-describedby={`${reasonId}-hint`}
          value={reason}
          maxLength={500}
          required
          onChange={(event) => {
            setReason(event.target.value);
          }}
        />
        <p id={`${reasonId}-hint`} className="text-muted-foreground text-sm">
          {actions("reasonHint")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={!valid || reason.trim() === "" || isPending}
          focusableWhenDisabled
        >
          {isPending ? t("saving") : t("save")}
        </Button>
        {limit.override === null ? null : (
          <Button
            type="button"
            variant="outline"
            disabled={reason.trim() === "" || isPending}
            focusableWhenDisabled
            onClick={() => {
              send(null);
            }}
          >
            {t("remove")}
          </Button>
        )}
      </div>
    </form>
  );
};
