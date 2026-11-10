"use client";

import { useAtomSet } from "@effect/atom-react";
import { DateTime, Exit, Option } from "effect";
import { useLocale } from "next-intl";
import { desiredDayHorizonDays } from "peal-contract";
import { useState, useTransition } from "react";

import {
  cancelSubscription,
  previewWithdrawal,
  withdraw,
} from "#billing/api.ts";
import { useCaptcha } from "#components/auth/turnstile-field.tsx";
import { ContractFunctionView } from "#components/contract/contract-function-view.tsx";
import { sendContractRequest } from "#contract/api.ts";
import { functionErrorOf } from "#contract/errors.ts";
import { invalidFields } from "#contract/form.ts";
import type {
  FunctionError,
  FunctionKind,
  FunctionStep,
  FunctionValues,
  InvalidField,
  OwnContract,
} from "#contract/form.ts";

interface ContractFunctionProps {
  readonly captchaSiteKey: string | null;
  readonly kind: FunctionKind;
  /** The contracts the signed-in member manages. */
  readonly own: readonly OwnContract[];
  /** The signed-in member, whose name and address prefill the rubrics. */
  readonly signedIn: { readonly email: string; readonly name: string } | null;
  /** The contract the billing page sent the member here for. */
  readonly workspaceId: string | null;
}

const form: FunctionStep = { _tag: "form" };

const today = () => new Date().toISOString().slice(0, 10);

const dayMs = 86_400_000;

// The latest day a cancellation may ask its contract to end.
const latest = () =>
  new Date(Date.now() + desiredDayHorizonDays * dayMs)
    .toISOString()
    .slice(0, 10);

/**
 * The function to cancel a contract or to withdraw from one, for anyone.
 * Signed out, or for a contract that is not the member's own, it sends
 * the form's request, which the server acknowledges by email. A member
 * who manages billing finds their name, their address and their contracts
 * filled in, and their request is applied at once, in their session.
 */
export const ContractFunction = ({
  captchaSiteKey,
  kind,
  own,
  signedIn,
  workspaceId,
}: ContractFunctionProps) => {
  const locale = useLocale();
  const send = useAtomSet(sendContractRequest, { mode: "promiseExit" });
  const cancel = useAtomSet(cancelSubscription, { mode: "promiseExit" });
  const preview = useAtomSet(previewWithdrawal, { mode: "promiseExit" });
  const confirm = useAtomSet(withdraw, { mode: "promiseExit" });
  const [step, setStep] = useState<FunctionStep>(form);
  const [error, setError] = useState<FunctionError | null>(null);
  const [invalid, setInvalid] = useState<readonly InvalidField[]>([]);
  const [isPending, startTransition] = useTransition();

  const [values, setValues] = useState<FunctionValues>({
    contract: "",
    desiredOn: "",
    email: signedIn?.email ?? "",
    name: signedIn?.name ?? "",
    workspaceId:
      own.find(({ id }) => id === workspaceId)?.id ?? own[0]?.id ?? null,
  });

  // A member's own contract is ended in their session: nothing to prove.
  const inSession = values.workspaceId !== null;
  const captcha = useCaptcha(inSession ? null : captchaSiteKey);

  const toSummary = () => {
    const refused = invalidFields(values);

    setInvalid(refused);
    setError(null);

    if (refused.length > 0) {
      return;
    }

    const own_ = values.workspaceId;

    if (kind === "cancellation" || own_ === null) {
      setStep({ _tag: "summary", refund: null });

      return;
    }

    // What withdrawing refunds, for the summary.
    startTransition(async () => {
      const found = await preview({ params: { workspaceId: own_ } });

      if (Exit.isSuccess(found)) {
        setStep({ _tag: "summary", refund: found.value.refund });
      }

      setError(Option.getOrNull(functionErrorOf(found)));
    });
  };

  const notifyInSession = async (own_: string) => {
    if (kind === "cancellation") {
      const done = await cancel({
        params: { workspaceId: own_ },
        payload: {
          desiredOn: values.desiredOn === "" ? null : values.desiredOn,
        },
      });

      if (Exit.isSuccess(done)) {
        setStep({
          _tag: "cancelled",
          endsAt: DateTime.toDate(done.value.endsAt),
        });
      }

      return functionErrorOf(done);
    }

    const done = await confirm({ params: { workspaceId: own_ } });

    if (Exit.isSuccess(done)) {
      setStep({ _tag: "withdrawn", refunded: done.value.refunded });
    }

    return functionErrorOf(done);
  };

  const notifyFromForm = async () => {
    const contract = values.contract.trim();

    const received = await send({
      headers: captcha.headers,
      payload: {
        contract: contract === "" ? null : contract,
        desiredOn:
          kind === "cancellation" && values.desiredOn !== ""
            ? values.desiredOn
            : null,
        email: values.email.trim(),
        kind,
        locale: locale === "fr" ? "fr" : "en",
        name: values.name.trim(),
      },
    });

    // The token is spent, whatever the answer.
    captcha.reset();

    if (Exit.isSuccess(received)) {
      setStep({
        _tag: "received",
        receivedAt: DateTime.toDate(received.value.receivedAt),
      });
    }

    return functionErrorOf(received);
  };

  const notify = () => {
    setError(null);

    startTransition(async () => {
      const failed =
        values.workspaceId === null
          ? await notifyFromForm()
          : await notifyInSession(values.workspaceId);

      setError(Option.getOrNull(failed));
    });
  };

  return (
    <ContractFunctionView
      captcha={captcha.widget}
      error={error}
      invalid={invalid}
      kind={kind}
      own={own}
      pending={isPending}
      ready={captcha.ready}
      signedInAs={signedIn?.email ?? null}
      step={step}
      latest={latest()}
      today={today()}
      values={values}
      onBack={() => {
        setError(null);
        setStep(form);
      }}
      onChange={setValues}
      onContinue={toSummary}
      onNotify={notify}
    />
  );
};
