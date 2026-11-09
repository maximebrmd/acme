"use client";

import { Option, Schema } from "effect";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { useEffect, useRef, useState, useTransition } from "react";
import type { SubmitEvent } from "react";

import { authClient } from "#auth/client.ts";
import { FormField } from "#components/auth/form-field.tsx";
import { ScopeList } from "#components/oauth/scope-list.tsx";

// What Better Auth tells the person who opened a code first: the client
// and the scopes it asks for, while the code waits for an answer.
const decodeVerification = Schema.decodeUnknownOption(
  Schema.Struct({
    client_id: Schema.String,
    scope: Schema.optional(Schema.NullOr(Schema.String)),
    status: Schema.Literal("pending"),
  })
);

const decodeClientName = Schema.decodeUnknownOption(
  Schema.Struct({ client_name: Schema.NonEmptyString })
);

type Problem = "failed" | "invalid" | "used";

type Step =
  | { readonly _tag: "decided"; readonly approved: boolean }
  | { readonly _tag: "entering" }
  | {
      readonly _tag: "reviewing";
      readonly client: Option.Option<string>;
      readonly scopes: readonly string[];
      readonly userCode: string;
    };

// The command line's sign-in, on the web: the person enters the code their
// terminal shows, sees what is asking and for what, then allows or denies
// it.
export const DeviceApproval = ({
  initialCode,
}: {
  readonly initialCode: string;
}) => {
  const t = useTranslations("OAuth.device");
  const oauth = useTranslations("OAuth");
  const [code, setCode] = useState(initialCode);
  const [step, setStep] = useState<Step>({ _tag: "entering" });
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isPending, startTransition] = useTransition();
  const reviewHeading = useRef<HTMLHeadingElement>(null);

  // The form that had focus is gone once the code is checked: focus moves to
  // what replaced it, which screen readers then read out.
  useEffect(() => {
    if (step._tag === "reviewing") {
      reviewHeading.current?.focus();
    }
  }, [step._tag]);

  const handleCheck = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      // Opening the code first makes it this person's to answer.
      const verified = await authClient.device({ query: { user_code: code } });

      if (verified.error !== null) {
        setProblem(verified.error.status === 400 ? "invalid" : "failed");

        return;
      }

      const pending = decodeVerification(verified.data);

      if (Option.isNone(pending)) {
        setProblem("used");

        return;
      }

      const client = await authClient.oauth2.publicClient({
        query: { client_id: pending.value.client_id },
      });

      setProblem(null);
      setStep({
        _tag: "reviewing",
        client: decodeClientName(client.data).pipe(
          Option.map(({ client_name: name }) => name)
        ),
        scopes: (pending.value.scope ?? "").split(" ").filter(Boolean),
        userCode: code,
      });
    });
  };

  const handleDecision = (approved: boolean, userCode: string) => () => {
    startTransition(async () => {
      const decided = approved
        ? await authClient.device.approve({ userCode })
        : await authClient.device.deny({ userCode });

      if (decided.error === null) {
        setStep({ _tag: "decided", approved });
      } else {
        setProblem("failed");
      }
    });
  };

  const alert =
    problem === null ? null : (
      <Alert variant="destructive">
        <AlertDescription>
          {problem === "failed" ? oauth("failed") : t(problem)}
        </AlertDescription>
      </Alert>
    );

  if (step._tag === "decided") {
    return (
      <Alert>
        <AlertDescription>
          {step.approved ? t("approved") : t("denied")}
        </AlertDescription>
      </Alert>
    );
  }

  if (step._tag === "reviewing") {
    const client = Option.getOrElse(step.client, () => oauth("unknownClient"));

    return (
      <div className="flex flex-col gap-4">
        {alert}
        <h2 ref={reviewHeading} tabIndex={-1} className="font-medium">
          {t("reviewTitle", { client })}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("reviewDescription")}
        </p>
        <ScopeList scopes={step.scopes} />
        <Alert>
          <AlertDescription>{t("onlyYours")}</AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button
            disabled={isPending}
            focusableWhenDisabled
            onClick={handleDecision(true, step.userCode)}
          >
            {isPending ? t("approving") : t("approve")}
          </Button>
          <Button
            variant="outline"
            disabled={isPending}
            focusableWhenDisabled
            onClick={handleDecision(false, step.userCode)}
          >
            {t("deny")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleCheck} className="flex flex-col gap-4">
      {alert}
      <FormField
        id="user-code"
        type="text"
        autoComplete="one-time-code"
        label={t("code")}
        hint={t("codeHint")}
        value={code}
        onChange={setCode}
      />
      <Button type="submit" disabled={isPending} focusableWhenDisabled>
        {isPending ? t("checking") : t("continue")}
      </Button>
    </form>
  );
};
