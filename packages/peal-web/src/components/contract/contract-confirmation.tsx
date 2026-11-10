"use client";

import { useAtomSet } from "@effect/atom-react";
import { Cause, Exit, Option } from "effect";
import { useEffect, useState, useTransition } from "react";

import { ContractConfirmationView } from "#components/contract/contract-confirmation-view.tsx";
import type { ConfirmationState } from "#components/contract/contract-confirmation-view.tsx";
import {
  confirmContractRequest,
  previewContractRequest,
} from "#contract/api.ts";

const tagOf = <A, E extends { readonly _tag: string }>(exit: Exit.Exit<A, E>) =>
  Exit.isSuccess(exit)
    ? Option.none<string>()
    : Cause.findErrorOption(exit.cause).pipe(Option.map(({ _tag }) => _tag));

const failureOf = (tag: Option.Option<string>): ConfirmationState =>
  Option.contains(tag, "ContractRequestNotFound")
    ? { _tag: "notFound" }
    : { _tag: "failed" };

/**
 * The page behind the link emailed to a request's address. The token is
 * sent in a request's body, never in a path the server would log. Applying
 * takes the person's click: a mail scanner that opens the link applies
 * nothing.
 */
export const ContractConfirmation = ({
  token,
}: {
  readonly token: string | null;
}) => {
  const preview = useAtomSet(previewContractRequest, { mode: "promiseExit" });
  const confirm = useAtomSet(confirmContractRequest, { mode: "promiseExit" });
  const [pending, setPending] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [, startTransition] = useTransition();

  const [state, setState] = useState<ConfirmationState>(
    token === null ? { _tag: "missing" } : { _tag: "loading" }
  );

  useEffect(() => {
    let current = true;

    const open = async () => {
      if (token === null) {
        return;
      }

      const found = await preview({ payload: { token } });

      if (current) {
        setState(
          Exit.isSuccess(found)
            ? { _tag: "choosing", preview: found.value }
            : failureOf(tagOf(found))
        );
      }
    };

    void open();

    return () => {
      current = false;
    };
  }, [preview, token]);

  const apply = (workspaceId: string) => {
    if (token === null) {
      return;
    }

    setPending(workspaceId);
    setUnavailable(false);

    startTransition(async () => {
      const done = await confirm({ payload: { token, workspaceId } });
      const tag = tagOf(done);

      setPending(null);

      if (Exit.isSuccess(done)) {
        setState({ _tag: "done", outcome: done.value });
      } else if (Option.contains(tag, "BillingUnavailable")) {
        // Nothing changed: the link still works.
        setUnavailable(true);
      } else {
        setState(failureOf(tag));
      }
    });
  };

  return (
    <ContractConfirmationView
      pending={pending}
      state={state}
      unavailable={unavailable}
      onApply={apply}
    />
  );
};
